import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Invoice from '../models/Invoice';
import Settings from '../models/Settings';
import Product from '../models/Product';
import Customer from '../models/Customer';

const router = Router();

function successResponse(res: Response, data: any, status: number = 200) {
  return res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

function errorResponse(res: Response, error: string, status: number = 500) {
  return res.status(status).json({
    success: false,
    error,
    timestamp: new Date().toISOString(),
  });
}

async function getNextInvoiceSequence(shopId: string): Promise<number> {
  const latest = await Invoice.findOne({ shop: shopId })
    .sort({ createdAt: -1 })
    .select('invoiceNumber')
    .lean();

  if (!latest?.invoiceNumber) {
    return 1000;
  }

  const match = /-(\d+)$/.exec(latest.invoiceNumber);
  return match ? Number(match[1]) + 1 : 1000;
}

async function generateInvoiceNumber(shopId: string): Promise<string> {
  let settings = await Settings.findOne({ shop: shopId });

  if (!settings) {
    const nextSequence = await getNextInvoiceSequence(shopId);
    settings = await Settings.create({
      shop: shopId,
      invoicePrefix: 'INV',
      invoiceStartNumber: nextSequence,
      invoiceAutoSequence: true,
      taxSystem: 'GST',
      taxRates: { standard: 18, reduced: 5 },
      notificationPreferences: {
        emailNotifications: true,
        whatsappNotifications: true,
        lowStockAlert: true,
      },
    });
  }

  if (settings.invoiceAutoSequence) {
    const actualNext = await getNextInvoiceSequence(shopId);
    await Settings.findOneAndUpdate(
      { shop: shopId },
      { $max: { invoiceStartNumber: actualNext } }
    );

    const updated = await Settings.findOneAndUpdate(
      { shop: shopId },
      { $inc: { invoiceStartNumber: 1 } },
      { returnDocument: 'after' }
    );
    const sequence = updated ? updated.invoiceStartNumber - 1 : settings.invoiceStartNumber;
    return `${settings.invoicePrefix}-${sequence}`;
  }

  return `${settings.invoicePrefix}-${settings.invoiceStartNumber}`;
}

// GET /api/invoices
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '50');
    const status = req.query.status as string;
    const customerId = req.query.customerId as string;

    let query: any = { shop: auth.shopId };

    if (status) {
      query.paymentStatus = status;
    }
    if (customerId) {
      query.customer = customerId;
    }

    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(query)
      .populate('customer')
      .populate('items.product')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Invoice.countDocuments(query);

    return successResponse(res, {
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    return errorResponse(res, error.message || 'Failed to get invoices', 500);
  }
});

// POST /api/invoices
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const {
      customerId,
      items,
      paymentMethod,
      paymentStatus,
      discountAmount,
      taxAmount: bodyTaxAmount,
      notes,
    } = req.body;

    if (!customerId || !items || items.length === 0) {
      return errorResponse(res, 'Customer and items are required', 400);
    }

    const settings =
      (await Settings.findOne({ shop: auth.shopId })) ||
      (await Settings.create({
        shop: auth.shopId,
        invoicePrefix: 'INV',
        invoiceStartNumber: 1000,
        invoiceAutoSequence: true,
        taxSystem: 'GST',
        taxRates: { standard: 18, reduced: 5 },
        notificationPreferences: {
          emailNotifications: true,
          whatsappNotifications: true,
          lowStockAlert: true,
        },
      }));

    let subtotal = 0;
    const taxAmount = typeof bodyTaxAmount === 'number' && bodyTaxAmount >= 0 ? bodyTaxAmount : 0;
    const processedItems = [];
    const stockUpdates: { product: any; quantity: number }[] = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        shop: auth.shopId,
      });

      if (!product) {
        return errorResponse(res, `Product ${item.productId} not found`, 404);
      }

      if (product.stock < item.quantity) {
        return errorResponse(res, `Insufficient stock for ${product.name}`, 400);
      }

      const itemSubtotal = product.unitPrice * item.quantity;
      const itemTax = 0;

      subtotal += itemSubtotal;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.unitPrice,
        tax: itemTax,
        subtotal: itemSubtotal,
      });

      stockUpdates.push({ product, quantity: item.quantity });
    }

    const total = subtotal + taxAmount - (discountAmount || 0);

    let invoice = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invoiceNumber = await generateInvoiceNumber(auth.shopId);
      try {
        const candidate = new Invoice({
          invoiceNumber,
          customer: customerId,
          items: processedItems,
          subtotal,
          taxAmount,
          discountAmount: discountAmount || 0,
          total: Math.max(0, total),
          paymentMethod: paymentMethod || 'cash',
          paymentStatus: paymentStatus || 'unpaid',
          notes: notes || '',
          shop: auth.shopId,
        });

        await candidate.save();
        invoice = candidate;
        break;
      } catch (error: any) {
        lastError = error;
        if (error?.code === 11000) {
          const actualNext = await getNextInvoiceSequence(auth.shopId);
          await Settings.findOneAndUpdate(
            { shop: auth.shopId },
            { $max: { invoiceStartNumber: actualNext } }
          );
          continue;
        }
        throw error;
      }
    }

    if (!invoice) {
      console.error('Create invoice failed after retries:', lastError);
      return errorResponse(res, 'Failed to create invoice. Please try again.', 500);
    }

    for (const { product, quantity } of stockUpdates) {
      product.stock -= quantity;
      await product.save();
    }

    await invoice.populate('customer');
    await invoice.populate('items.product');

    return successResponse(res, invoice, 201);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    return errorResponse(res, error.message || 'Failed to create invoice', 500);
  }
});

// GET /api/invoices/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const invoice = await Invoice.findOne({
      _id: id,
      shop: auth.shopId,
    })
      .populate('customer')
      .populate('items.product');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    return successResponse(res, invoice);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    return errorResponse(res, error.message || 'Failed to get invoice', 500);
  }
});

// PUT /api/invoices/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;
    const { paymentStatus, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: id,
      shop: auth.shopId,
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    if (paymentStatus) {
      invoice.paymentStatus = paymentStatus;
    }
    if (notes !== undefined) {
      invoice.notes = notes;
    }

    await invoice.save();
    await invoice.populate('customer');
    await invoice.populate('items.product');

    return successResponse(res, invoice);
  } catch (error: any) {
    console.error('Update invoice error:', error);
    return errorResponse(res, error.message || 'Failed to update invoice', 500);
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const invoice = await Invoice.findOneAndDelete({
      _id: id,
      shop: auth.shopId,
    });

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    return successResponse(res, { message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    return errorResponse(res, error.message || 'Failed to delete invoice', 500);
  }
});

export default router;

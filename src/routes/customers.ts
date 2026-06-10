import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
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

// GET /api/customers
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const search = req.query.search as string;

    let query: any = { shop: auth.shopId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const customers = await Customer.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Customer.countDocuments(query);

    return successResponse(res, {
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get customers error:', error);
    return errorResponse(res, error.message || 'Failed to get customers', 500);
  }
});

// POST /api/customers
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { name, email, phone, address, customerType, gstNumber } = req.body;

    if (!name || !phone) {
      return errorResponse(res, 'Name and phone are required', 400);
    }

    const customer = new Customer({
      name,
      email: email || '',
      phone,
      address: address || '',
      customerType: customerType || 'retail',
      gstNumber: gstNumber || '',
      shop: auth.shopId,
      loyaltyPoints: 0,
    });

    await customer.save();

    return successResponse(res, customer, 201);
  } catch (error: any) {
    console.error('Create customer error:', error);
    return errorResponse(res, error.message || 'Failed to create customer', 500);
  }
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      shop: auth.shopId,
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    return successResponse(res, customer);
  } catch (error: any) {
    console.error('Get customer error:', error);
    return errorResponse(res, error.message || 'Failed to get customer', 500);
  }
});

// PUT /api/customers/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;
    const body = req.body;

    const customer = await Customer.findOne({
      _id: id,
      shop: auth.shopId,
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    Object.assign(customer, body);
    await customer.save();

    return successResponse(res, customer);
  } catch (error: any) {
    console.error('Update customer error:', error);
    return errorResponse(res, error.message || 'Failed to update customer', 500);
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const customer = await Customer.findOneAndDelete({
      _id: id,
      shop: auth.shopId,
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    return successResponse(res, { message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    return errorResponse(res, error.message || 'Failed to delete customer', 500);
  }
});

export default router;

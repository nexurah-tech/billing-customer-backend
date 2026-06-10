import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Shop from '../models/Shop';
import Payment from '../models/Payment';
import SystemConfig from '../models/SystemConfig';

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

// GET /api/shop
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const shop = await Shop.findById(auth.shopId).select('-owner -__v');
    if (!shop) return errorResponse(res, 'Shop not found', 404);
    return successResponse(res, { shop });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to get shop', 500);
  }
});

// PUT /api/shop
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { name, phone, address, gstin } = req.body;
    const shop = await Shop.findByIdAndUpdate(
      auth.shopId,
      { name, phone, address, gstin },
      { new: true, runValidators: true }
    );
    if (!shop) return errorResponse(res, 'Shop not found', 404);
    return successResponse(res, { shop });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to update shop', 500);
  }
});

// GET /api/shop/subscription
router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const shop = await Shop.findById(auth.shopId);
    if (!shop) return errorResponse(res, 'Shop not found', 404);

    const payments = await Payment.find({ shop: shop._id }).sort({ createdAt: -1 });

    let qrConfig = await SystemConfig.findOne();
    if (!qrConfig) {
      qrConfig = await SystemConfig.create({
        paymentQrCodeUrl: 'https://res.cloudinary.com/dihkz12e6/image/upload/v1700000000/mock-qr.png',
        whatsappNumber: '+919600950190',
      });
    }

    return successResponse(res, {
      subscription: {
        status: shop.subscriptionStatus,
        plan: shop.subscriptionPlan,
        expiresAt: shop.subscriptionExpiresAt,
        lastPaymentDate: shop.lastPaymentDate,
        trialEndsAt: shop.trialEndsAt,
      },
      payments,
      qrConfig: {
        paymentQrCodeUrl: qrConfig.paymentQrCodeUrl,
        whatsappNumber: qrConfig.whatsappNumber,
      },
    });
  } catch (error: any) {
    console.error('Fetch subscription details error:', error);
    return errorResponse(res, error.message || 'Failed to fetch subscription data', 500);
  }
});

export default router;

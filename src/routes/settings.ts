import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Settings from '../models/Settings';

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

const DEFAULT_SETTINGS = {
  invoicePrefix: 'INV',
  invoiceStartNumber: 1000,
  invoiceAutoSequence: true,
  taxSystem: 'GST',
  taxRates: {
    standard: 18,
    reduced: 5,
  },
  notificationPreferences: {
    emailNotifications: true,
    whatsappNotifications: true,
    lowStockAlert: true,
  },
};

// GET /api/settings
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    let settings = await Settings.findOne({ shop: auth.shopId });
    if (!settings) {
      settings = await Settings.create({
        shop: auth.shopId,
        ...DEFAULT_SETTINGS,
      });
    }
    return successResponse(res, { settings });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to get settings', 500);
  }
});

// PUT /api/settings
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const body = req.body;
    const update: any = {};

    if (typeof body.invoicePrefix === 'string') {
      update.invoicePrefix = body.invoicePrefix;
    }
    if (typeof body.invoiceStartNumber === 'number') {
      update.invoiceStartNumber = body.invoiceStartNumber;
    }
    if (typeof body.invoiceAutoSequence === 'boolean') {
      update.invoiceAutoSequence = body.invoiceAutoSequence;
    }
    if (typeof body.taxSystem === 'string') {
      update.taxSystem = body.taxSystem;
    }
    if (typeof body.taxRates === 'object') {
      update.taxRates = { ...body.taxRates };
    }
    if (typeof body.notificationPreferences === 'object') {
      update.notificationPreferences = { ...body.notificationPreferences };
    }

    const settings = await Settings.findOneAndUpdate(
      { shop: auth.shopId },
      { $set: update },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    if (!settings) return errorResponse(res, 'Settings not found', 404);

    return successResponse(res, { settings });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to update settings', 500);
  }
});

export default router;

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Notification from '../models/Notification';

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

// GET /api/notifications
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;

    const shopId = new mongoose.Types.ObjectId(auth.shopId);
    const userId = new mongoose.Types.ObjectId(auth.userId);

    const notifications = await Notification.find({
      isAdminOnly: { $ne: true },
      title: { $nin: [/Terminal Sign-in Attempt/i, /Approval Request/i] },
      $or: [
        { targetShop: shopId },
        { targetShop: { $in: [null, undefined] } },
      ],
    }).sort({ createdAt: -1 }).lean();

    const formattedNotifications = notifications.map((n) => {
      const isRead = n.readBy.some((id: mongoose.Types.ObjectId) => id.toString() === userId.toString());
      return {
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead,
        createdAt: n.createdAt,
      };
    });

    const unreadCount = formattedNotifications.filter((n) => !n.isRead).length;

    return successResponse(res, {
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return errorResponse(res, error.message || 'Failed to get notifications', 500);
  }
});

// POST /api/notifications
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;

    const userId = new mongoose.Types.ObjectId(auth.userId);
    const shopId = new mongoose.Types.ObjectId(auth.shopId);
    const { notificationId, markAllAsRead } = req.body;

    if (markAllAsRead) {
      const notifications = await Notification.find({
        isAdminOnly: { $ne: true },
        title: { $nin: [/Terminal Sign-in Attempt/i, /Approval Request/i] },
        $or: [
          { targetShop: shopId },
          { targetShop: null },
        ],
        readBy: { $ne: userId },
      });

      for (const n of notifications) {
        n.readBy.push(userId);
        await n.save();
      }

      return successResponse(res, { success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return errorResponse(res, 'Missing notificationId', 400);
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    const alreadyRead = notification.readBy.some((id: mongoose.Types.ObjectId) => id.toString() === userId.toString());
    if (!alreadyRead) {
      notification.readBy.push(userId);
      await notification.save();
    }

    return successResponse(res, { success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return errorResponse(res, error.message || 'Failed to update notification', 500);
  }
});

export default router;

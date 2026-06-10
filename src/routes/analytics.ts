import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Invoice from '../models/Invoice';
import Customer from '../models/Customer';
import Product from '../models/Product';

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

// GET /api/analytics
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;

    const period = (req.query.period as string) || 'month';
    const startParam = req.query.startDate as string;
    const endParam = req.query.endDate as string;

    let startDate = new Date();
    let endDate = new Date();
    let isSpecificRange = false;

    if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
      if (endParam.length === 10) {
        endDate.setHours(23, 59, 59, 999);
      }
      isSpecificRange = true;
    } else {
      if (period === 'day') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
    }

    const query: any = {
      shop: auth.shopId,
      createdAt: { $gte: startDate },
    };
    
    if (isSpecificRange) {
      query.createdAt.$lte = endDate;
    }

    const invoices = await Invoice.find(query).populate('items.product');
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalOrders = invoices.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paymentStatusBreakdown = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]);

    const paymentMethodBreakdown = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]);

    const dayOfWeekMap: Record<number, { orders: number; revenue: number }> = {};
    for (let d = 0; d < 7; d++) dayOfWeekMap[d] = { orders: 0, revenue: 0 };
    for (const inv of invoices) {
      const dow = new Date(inv.createdAt).getUTCDay();
      dayOfWeekMap[dow].orders += 1;
      dayOfWeekMap[dow].revenue += inv.total;
    }
    const dayOfWeekDistribution = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
      (label, i) => ({ label, ...dayOfWeekMap[i] })
    );

    const productTotals: Record<
      string,
      {
        productId: string;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
      }
    > = {};

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const productId = item.product instanceof Object
          ? item.product._id?.toString() || item.product.toString()
          : item.product.toString();
        const productName = item.product && typeof item.product === 'object' && 'name' in item.product
          ? (item.product as any).name
          : 'Unknown';

        if (!productTotals[productId]) {
          productTotals[productId] = {
            productId,
            productName,
            totalQuantity: 0,
            totalRevenue: 0,
          };
        }

        productTotals[productId].totalQuantity += item.quantity;
        productTotals[productId].totalRevenue += item.subtotal;
      }
    }

    const topProducts = Object.values(productTotals)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    const totalCustomers = await Customer.countDocuments({ shop: auth.shopId });
    const activeCustomers = await Invoice.distinct('customer', query);

    const trendMap: Record<string, { revenue: number; orders: number }> = {};
    for (const invoice of invoices) {
      let isHourly = false;
      if (isSpecificRange) {
         const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
         if (diffDays <= 2) isHourly = true;
      } else {
         if (period === 'day') isHourly = true;
      }
      
      const key = isHourly 
        ? invoice.createdAt.toISOString().slice(0, 13) 
        : invoice.createdAt.toISOString().slice(0, 10);
        
      if (!trendMap[key]) {
        trendMap[key] = { revenue: 0, orders: 0 };
      }
      trendMap[key].revenue += invoice.total;
      trendMap[key].orders += 1;
    }

    const revenueTrend = Object.entries(trendMap)
      .map(([key, values]) => ({
        _id: key,
        revenue: values.revenue,
        orders: values.orders,
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

    return successResponse(res, {
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalCustomers,
        activeCustomers: activeCustomers.length,
      },
      paymentStatusBreakdown,
      paymentMethodBreakdown,
      dayOfWeekDistribution,
      topProducts,
      revenueTrend,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return errorResponse(res, error.message || 'Failed to get analytics', 500);
  }
});

export default router;

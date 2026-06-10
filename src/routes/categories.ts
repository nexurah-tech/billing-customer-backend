import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Category from '../models/Category';

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

// GET /api/categories
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    let categories = await Category.find({ shop: auth.shopId }).sort({
      createdAt: -1,
    });

    const defaultNames = [
      'Beverages',
      'Snacks',
      'Groceries',
      'Electronics',
      'Clothing & Apparel',
      'Stationery',
      'Household',
      'General'
    ];

    const existingNames = new Set(categories.map(c => c.name.trim().toLowerCase()));
    const missingNames = defaultNames.filter(name => !existingNames.has(name.toLowerCase()));

    if (missingNames.length > 0) {
      const seedData = missingNames.map(name => ({
        name,
        description: `Default ${name.toLowerCase()} category`,
        shop: auth.shopId
      }));

      await Category.insertMany(seedData);

      categories = await Category.find({ shop: auth.shopId }).sort({
        createdAt: -1,
      });
    }

    return successResponse(res, { categories });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return errorResponse(res, error.message || 'Failed to get categories', 500);
  }
});

// POST /api/categories
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { name, description } = req.body;

    if (!name) {
      return errorResponse(res, 'Category name is required', 400);
    }

    const category = new Category({
      name,
      description: description || '',
      shop: auth.shopId,
    });

    await category.save();

    return successResponse(res, category, 201);
  } catch (error: any) {
    console.error('Create category error:', error);
    return errorResponse(res, error.message || 'Failed to create category', 500);
  }
});

// GET /api/categories/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const category = await Category.findOne({
      _id: id,
      shop: auth.shopId,
    });

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    return successResponse(res, category);
  } catch (error: any) {
    console.error('Get category error:', error);
    return errorResponse(res, error.message || 'Failed to get category', 500);
  }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;
    const body = req.body;

    const category = await Category.findOne({
      _id: id,
      shop: auth.shopId,
    });

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    Object.assign(category, body);
    await category.save();

    return successResponse(res, category);
  } catch (error: any) {
    console.error('Update category error:', error);
    return errorResponse(res, error.message || 'Failed to update category', 500);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const category = await Category.findOneAndDelete({
      _id: id,
      shop: auth.shopId,
    });

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    return successResponse(res, { message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return errorResponse(res, error.message || 'Failed to delete category', 500);
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { connectDB } from '../lib/db';
import { authMiddleware } from '../lib/auth';
import Product from '../models/Product';
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

// GET /api/products
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const category = req.query.category as string;
    const search = req.query.search as string;

    let query: any = { shop: auth.shopId };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('category')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    return successResponse(res, {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    return errorResponse(res, error.message || 'Failed to get products', 500);
  }
});

// POST /api/products
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const {
      name,
      description,
      sku,
      category,
      unit,
      unitPrice,
      costPrice,
      stock,
      reorderLevel,
      taxApplicable,
      imageUrl,
    } = req.body;

    if (!name || !sku || !category || unitPrice === undefined || unitPrice === null || costPrice === undefined || costPrice === null) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    const existingSku = await Product.findOne({
      sku: sku.toUpperCase(),
      shop: auth.shopId,
    });
    if (existingSku) {
      return errorResponse(res, 'SKU already exists', 400);
    }

    const product = new Product({
      name,
      description,
      sku: sku.toUpperCase(),
      category,
      unit: unit ? unit.trim() : 'pcs',
      unitPrice,
      costPrice,
      stock: stock || 0,
      reorderLevel: reorderLevel || 10,
      taxApplicable: taxApplicable !== false,
      imageUrl,
      shop: auth.shopId,
    });

    await product.save();
    await product.populate('category');

    return successResponse(res, product, 201);
  } catch (error: any) {
    console.error('Create product error:', error);
    return errorResponse(res, error.message || 'Failed to create product', 500);
  }
});

// POST /api/products/bulk
router.post('/bulk', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return errorResponse(res, 'No products data provided', 400);
    }

    const skus = new Set<string>();
    for (const item of products) {
      if (!item.name || !item.sku || !item.category || item.unitPrice === undefined || item.costPrice === undefined) {
        return errorResponse(res, 'Missing required fields in one or more items', 400);
      }
      const skuUpper = item.sku.toUpperCase().trim();
      if (skus.has(skuUpper)) {
        return errorResponse(res, `Duplicate SKU code in upload: ${skuUpper}`, 400);
      }
      skus.add(skuUpper);

      const unitPrice = Number(item.unitPrice);
      const costPrice = Number(item.costPrice);
      const stock = item.stock !== undefined ? Number(item.stock) : 0;
      const reorderLevel = item.reorderLevel !== undefined ? Number(item.reorderLevel) : 10;

      if (isNaN(unitPrice) || unitPrice < 0 || isNaN(costPrice) || costPrice < 0) {
        return errorResponse(res, `Invalid price values for product "${item.name}". Unit Price and Cost Price must be valid numbers >= 0.`, 400);
      }
      if (isNaN(stock) || stock < 0 || isNaN(reorderLevel) || reorderLevel < 0) {
        return errorResponse(res, `Invalid inventory values for product "${item.name}". Stock and Reorder Level must be valid numbers >= 0.`, 400);
      }
    }

    const existingProducts = await Product.find({
      shop: auth.shopId,
      sku: { $in: Array.from(skus) }
    });

    const existingSkusSet = new Set(existingProducts.map(p => p.sku.toUpperCase().trim()));
    const productsToProcess = products.filter(item => {
      const skuUpper = item.sku.toUpperCase().trim();
      return !existingSkusSet.has(skuUpper);
    });

    const skippedCount = existingProducts.length;

    if (productsToProcess.length === 0) {
      return successResponse(res, {
        count: 0,
        categoriesCreated: 0,
        skippedCount,
        message: `Import complete: 0 products added. All ${skippedCount} products already exist in your inventory and were skipped.`
      }, 200);
    }

    const uniqueCategoryNames = Array.from(
      new Set(productsToProcess.map((item: any) => item.category.trim()))
    );

    const existingCategories = await Category.find({ shop: auth.shopId });

    const categoryMap: Record<string, string> = {};
    existingCategories.forEach((cat) => {
      categoryMap[cat.name.trim().toLowerCase()] = cat._id.toString();
    });

    const newCategoriesToCreate = [];
    const seenNewCategories = new Set<string>();

    for (const catName of uniqueCategoryNames) {
      const normalizedName = catName.trim();
      const lowerName = normalizedName.toLowerCase();
      if (!categoryMap[lowerName] && !seenNewCategories.has(lowerName)) {
        newCategoriesToCreate.push({
          name: normalizedName,
          shop: auth.shopId,
        });
        seenNewCategories.add(lowerName);
      }
    }

    if (newCategoriesToCreate.length > 0) {
      const createdCategories = await Category.insertMany(newCategoriesToCreate);
      createdCategories.forEach((cat) => {
        categoryMap[cat.name.trim().toLowerCase()] = cat._id.toString();
      });
    }

    const productsToInsert = productsToProcess.map((item: any) => {
      const catName = item.category.trim();
      const catId = categoryMap[catName.toLowerCase()];

      if (!catId) {
        throw new Error(`Category "${catName}" could not be resolved`);
      }

      return {
        name: item.name.trim(),
        sku: item.sku.toUpperCase().trim(),
        category: catId,
        unit: item.unit ? item.unit.trim() : 'pcs',
        unitPrice: Number(item.unitPrice),
        costPrice: Number(item.costPrice),
        stock: Number(item.stock || 0),
        reorderLevel: Number(item.reorderLevel || 10),
        taxApplicable: item.taxApplicable !== false,
        description: item.description ? item.description.trim() : '',
        shop: auth.shopId,
      };
    });

    const result = await Product.insertMany(productsToInsert);

    return successResponse(res, {
      count: result.length,
      categoriesCreated: newCategoriesToCreate.length,
      skippedCount,
      message: `Successfully imported ${result.length} products and created ${newCategoriesToCreate.length} new categories.${
        skippedCount > 0 ? ` Skipped ${skippedCount} duplicate SKU products.` : ''
      }`
    }, 201);
  } catch (error: any) {
    console.error('Bulk upload products error:', error);
    if (error.code === 11000) {
      const keyValue = error.keyValue || {};
      const skuValue = keyValue.sku || 'unknown';
      return errorResponse(res, `Duplicate SKU code error: a product with SKU "${skuValue}" already exists in your inventory.`, 400);
    }
    return errorResponse(res, error.message || 'Failed to bulk upload products', 500);
  }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      shop: auth.shopId,
    }).populate('category');

    if (!product) {
      return errorResponse(res, 'Product not found', 404);
    }

    return successResponse(res, product);
  } catch (error: any) {
    console.error('Get product error:', error);
    return errorResponse(res, error.message || 'Failed to get product', 500);
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;
    const body = req.body;

    const product = await Product.findOne({
      _id: id,
      shop: auth.shopId,
    });

    if (!product) {
      return errorResponse(res, 'Product not found', 404);
    }

    Object.assign(product, body);
    await product.save();
    await product.populate('category');

    return successResponse(res, product);
  } catch (error: any) {
    console.error('Update product error:', error);
    return errorResponse(res, error.message || 'Failed to update product', 500);
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user!;
    const { id } = req.params;

    const product = await Product.findOneAndDelete({
      _id: id,
      shop: auth.shopId,
    });

    if (!product) {
      return errorResponse(res, 'Product not found', 404);
    }

    return successResponse(res, { message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return errorResponse(res, error.message || 'Failed to delete product', 500);
  }
});

export default router;

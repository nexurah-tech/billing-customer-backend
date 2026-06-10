import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware } from '../lib/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// POST /api/upload
router.post('/', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    if (!file.mimetype.startsWith('image/')) {
      return errorResponse(res, 'Only image files are allowed', 400);
    }

    const base64Data = file.buffer.toString('base64');
    const fileUri = `data:${file.mimetype};base64,${base64Data}`;

    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: 'billing-products',
    });

    return successResponse(res, {
      imageUrl: uploadResult.secure_url,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return errorResponse(res, error.message || 'Failed to upload image file', 500);
  }
});

export default router;

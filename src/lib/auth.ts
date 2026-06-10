import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface JwtPayload {
  userId: string;
  email: string;
  shopId: string;
  role: string;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateToken(payload: Omit<JwtPayload, 'exp'>, expiresIn: any = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  req.user = decoded;
  next();
}

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../lib/db';
import { generateToken, authMiddleware } from '../lib/auth';
import User from '../models/User';
import Shop from '../models/Shop';
import Notification from '../models/Notification';
import SystemConfig from '../models/SystemConfig';
import { sendOtpEmail } from '../lib/mail';

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

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { email, password, name, shopName, phone, address } = req.body;

    if (!email || !password || !name || !shopName || !phone || !address) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 400);
    }

    const userId = new mongoose.Types.ObjectId();
    const shopId = new mongoose.Types.ObjectId();

    const user = new User({
      _id: userId,
      email: email.toLowerCase(),
      password,
      name,
      shop: shopId,
      role: 'owner',
      status: 'pending',
    });

    const shop = new Shop({
      _id: shopId,
      name: shopName,
      phone,
      email,
      address,
      owner: userId,
    });

    await user.save();
    await shop.save();

    try {
      const adminNotif = new Notification({
        title: `Approval Request: ${shopName}`,
        message: `New shop registration request: Owner "${name}" registered "${shopName}" (Email: ${email}, Phone: ${phone}). Awaiting approval.`,
        type: 'alert',
        targetShop: null,
        isAdminOnly: true,
        readBy: [],
      });
      await adminNotif.save();
    } catch (notifError) {
      console.error('Error creating super admin notification on signup:', notifError);
    }

    const token = generateToken({
      userId: userId.toString(),
      email: user.email,
      shopId: shopId.toString(),
      role: user.role,
    });

    return successResponse(res, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      shop: {
        id: shop._id,
        name: shop.name,
      },
      token,
    }, 201);
  } catch (error: any) {
    console.error('Signup error:', error);
    let friendlyError = 'Registration failed. Please try again.';

    if (error.code === 11000) {
      friendlyError = 'This email address is already registered. Please sign in instead.';
    } else if (error.name === 'ValidationError' && error.errors) {
      const fieldErrors: string[] = [];
      for (const field in error.errors) {
        const fieldError = error.errors[field];
        if (field === 'password') {
          fieldErrors.push('Password must be at least 8 characters and include numbers and symbols.');
        } else if (field === 'email') {
          fieldErrors.push('Please enter a valid email address.');
        } else if (field === 'phone') {
          fieldErrors.push('Phone number must be exactly 10 digits.');
        } else {
          fieldErrors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is invalid or missing.`);
        }
      }
      if (fieldErrors.length > 0) {
        friendlyError = fieldErrors.join(' ');
      }
    } else if (error.message?.toLowerCase().includes('password')) {
      friendlyError = 'Password must be at least 8 characters and include numbers and symbols.';
    } else if (error.message?.toLowerCase().includes('email')) {
      friendlyError = 'Please enter a valid email address.';
    } else if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('connect')) {
      friendlyError = 'Unable to connect to the server. Please check your connection and try again.';
    }

    return errorResponse(res, friendlyError, 500);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (user.status === 'pending') {
      let shopName = 'Unknown Shop';
      let phone = 'N/A';
      let shopEmail = 'N/A';
      try {
        const shop = await Shop.findById(user.shop);
        if (shop) {
          shopName = shop.name;
          phone = shop.phone;
          shopEmail = shop.email;
        }
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingAlert = await Notification.findOne({
          title: `Terminal Sign-in Attempt`,
          message: new RegExp(user.email, 'i'),
          createdAt: { $gte: fiveMinutesAgo }
        });
        
        if (!existingAlert) {
          const adminNotif = new Notification({
            title: `Terminal Sign-in Attempt`,
            message: `Owner "${user.name}" (${user.email}) from pending terminal "${shopName}" (Phone: ${phone}) attempted to log in. Terminal activation is required.`,
            type: 'alert',
            targetShop: null,
            isAdminOnly: true,
            readBy: [],
          });
          await adminNotif.save();
        }
      } catch (notifError) {
        console.error('Error creating sign-in attempt alert for super admin:', notifError);
      }
      return res.status(401).json({
        success: false,
        error: 'Your account is pending approval by the administrator. A notification has been sent to the super admin.',
        status: 'pending',
        userName: user.name,
        role: user.role,
        shopName,
        contactPhone: phone,
        contactEmail: shopEmail,
      });
    }

    if (user.status === 'blocked') {
      const rawUser = await User.findOne({ email: email.toLowerCase() }).lean() as any;
      const dbBlockReason = (rawUser && rawUser.blockReason) || 'Subscription Payment Overdue';
      
      let shopName = 'Unknown Shop';
      let phone = 'N/A';
      let shopEmail = 'N/A';
      try {
        const shop = await Shop.findById(user.shop);
        if (shop) {
          shopName = shop.name;
          phone = shop.phone;
          shopEmail = shop.email;
        }
      } catch (shopError) {
        console.error('Error fetching shop for blocked user login response:', shopError);
      }
      
      return res.status(401).json({
        success: false,
        error: 'Your account has been suspended due to pending monthly payments. Please contact admin.',
        status: 'blocked',
        userName: user.name,
        role: user.role,
        shopName,
        contactPhone: phone,
        contactEmail: shopEmail,
        blockReason: dbBlockReason,
      });
    }

    if (user.status === 'rejected') {
      let shopName = 'Unknown Shop';
      let phone = 'N/A';
      let shopEmail = 'N/A';
      try {
        const shop = await Shop.findById(user.shop);
        if (shop) {
          shopName = shop.name;
          phone = shop.phone;
          shopEmail = shop.email;
        }
      } catch (shopError) {
        console.error('Error fetching shop for rejected user login response:', shopError);
      }
      
      return res.status(401).json({
        success: false,
        error: 'Your registration request has been rejected by the administrator.',
        status: 'rejected',
        userName: user.name,
        role: user.role,
        shopName,
        contactPhone: phone,
        contactEmail: shopEmail,
      });
    }

    if (user.status !== 'active') {
      return errorResponse(res, 'Your account is inactive.', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const shop = await Shop.findById(user.shop);
    if (!shop) {
      return errorResponse(res, 'Shop not found', 404);
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      shopId: shop._id.toString(),
      role: user.role,
    });

    return successResponse(res, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      shop: {
        id: shop._id,
        name: shop.name,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(res, error.message || 'Login failed', 500);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return successResponse(res, { message: 'If the email is registered, an OTP has been sent.' });
    }

    if (user.status !== 'active') {
      return errorResponse(res, 'This account is not active. Please contact administrator.', 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOtp = otp;
    user.resetOtpExpiry = otpExpiry;
    await user.save();

    try {
      await sendOtpEmail(user.email, otp, user.name);
    } catch (mailError) {
      console.error('Failed to send OTP email:', mailError);
      return errorResponse(res, 'Failed to send verification email. Please try again later.', 500);
    }

    return successResponse(res, { message: 'Verification OTP has been sent to your email.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return errorResponse(res, error.message || 'Something went wrong', 500);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return errorResponse(res, 'Email, OTP, and new password are required', 400);
    }

    if (newPassword.length < 8) {
      return errorResponse(res, 'Password must be at least 8 characters long', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return errorResponse(res, 'Invalid request or user not found', 404);
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return errorResponse(res, 'No verification request found. Please request a new OTP.', 400);
    }

    if (new Date() > user.resetOtpExpiry) {
      return errorResponse(res, 'Verification code has expired. Please request a new OTP.', 400);
    }

    if (user.resetOtp !== otp.trim()) {
      return errorResponse(res, 'Invalid verification code. Please try again.', 400);
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    return successResponse(res, { message: 'Password has been reset successfully.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return errorResponse(res, error.message || 'Something went wrong', 500);
  }
});

// GET /api/auth/status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    await connectDB();
    const auth = req.user;
    if (!auth) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const user = await User.findById(auth.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    let shop = null;
    let subscriptionInfo = null;
    let qrCodeConfig = null;

    if (user.shop) {
      shop = await Shop.findByIdAndUpdate(
        user.shop,
        { lastActiveAt: new Date() },
        { returnDocument: 'after' }
      );

      if (shop) {
        qrCodeConfig = await SystemConfig.findOne();
        if (!qrCodeConfig) {
          qrCodeConfig = await SystemConfig.create({
            paymentQrCodeUrl: 'https://res.cloudinary.com/dihkz12e6/image/upload/v1700000000/mock-qr.png',
            whatsappNumber: '+919600950190'
          });
        }

        const now = new Date();
        const expiresAt = new Date(shop.subscriptionExpiresAt);
        const diffTime = now.getTime() - expiresAt.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let isExpired = now > expiresAt;
        let isGracePeriod = isExpired && diffDays <= 3;
        let isSuspended = isExpired && diffDays > 3;

        let newStatus = shop.subscriptionStatus;
        if (isSuspended) {
          newStatus = 'suspended';
        } else if (isGracePeriod) {
          newStatus = 'past_due';
        } else if (!isExpired) {
          newStatus = shop.subscriptionStatus === 'trialing' ? 'trialing' : 'active';
        }

        if (newStatus !== shop.subscriptionStatus) {
          shop.subscriptionStatus = newStatus;
          await shop.save();
        }

        subscriptionInfo = {
          status: shop.subscriptionStatus,
          expiresAt: shop.subscriptionExpiresAt,
          trialEndsAt: shop.trialEndsAt,
          isExpired,
          isGracePeriod,
          graceDaysLeft: isGracePeriod ? Math.max(0, 3 - diffDays) : 0,
          paymentQrCodeUrl: qrCodeConfig.paymentQrCodeUrl,
          whatsappNumber: qrCodeConfig.whatsappNumber,
        };

        if (isSuspended) {
          user.status = 'blocked';
          user.blockReason = 'Subscription Payment Overdue';
          await user.save();
        }
      }
    }

    return successResponse(res, {
      status: user.status,
      role: user.role,
      name: user.name,
      email: user.email,
      blockReason: user.blockReason,
      subscription: subscriptionInfo,
    });
  } catch (error: any) {
    console.error('Check status error:', error);
    return errorResponse(res, error.message || 'Failed to check status', 500);
  }
});

export default router;

import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  license: string;
  owner: mongoose.Types.ObjectId;
  currency: string;
  taxRate: number;
  businessHours: {
    open: string;
    close: string;
  };
  subscriptionStatus: 'active' | 'trialing' | 'unpaid' | 'past_due' | 'suspended';
  subscriptionPlan: 'monthly' | 'yearly' | 'free_trial';
  subscriptionExpiresAt: Date;
  lastPaymentDate?: Date;
  lastActiveAt?: Date;
  trialEndsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shopSchema = new Schema<IShop>(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    gstin: {
      type: String,
      default: '',
    },
    license: {
      type: String,
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    taxRate: {
      type: Number,
      default: 18,
    },
    businessHours: {
      open: {
        type: String,
        default: '09:00',
      },
      close: {
        type: String,
        default: '21:00',
      },
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'unpaid', 'past_due', 'suspended'],
      default: 'trialing',
    },
    subscriptionPlan: {
      type: String,
      enum: ['monthly', 'yearly', 'free_trial'],
      default: 'free_trial',
    },
    subscriptionExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days free trial
    },
    lastPaymentDate: {
      type: Date,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Shop || mongoose.model<IShop>('Shop', shopSchema);

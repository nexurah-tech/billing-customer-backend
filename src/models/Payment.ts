import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  shop: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: 'upi' | 'cash' | 'card' | 'bank_transfer' | 'manual';
  referenceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed'],
      default: 'paid',
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'cash', 'card', 'bank_transfer', 'manual'],
      default: 'manual',
    },
    referenceId: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

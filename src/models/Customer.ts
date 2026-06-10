import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  customerType: 'retail' | 'wholesale';
  gstNumber: string;
  loyaltyPoints: number;
  shop: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    customerType: {
      type: String,
      enum: ['retail', 'wholesale'],
      default: 'retail',
    },
    gstNumber: {
      type: String,
      default: '',
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ shop: 1, phone: 1 });
customerSchema.index({ shop: 1, email: 1 });

export default mongoose.models.Customer ||
  mongoose.model<ICustomer>('Customer', customerSchema);

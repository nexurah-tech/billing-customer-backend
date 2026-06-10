import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  paymentQrCodeUrl: string;
  whatsappNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    paymentQrCodeUrl: {
      type: String,
      default: 'https://res.cloudinary.com/dihkz12e6/image/upload/v1700000000/mock-qr.png',
    },
    whatsappNumber: {
      type: String,
      default: '+919600950190',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'info' | 'alert' | 'payment';
  targetShop?: mongoose.Types.ObjectId;
  isAdminOnly?: boolean;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'alert', 'payment'],
      default: 'info',
    },
    targetShop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      default: null,
    },
    isAdminOnly: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ targetShop: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

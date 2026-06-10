import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  shop: mongoose.Types.ObjectId;
  invoicePrefix: string;
  invoiceStartNumber: number;
  invoiceAutoSequence: boolean;
  invoiceColumns: string[];
  taxSystem: string;
  taxRates: {
    standard: number;
    reduced: number;
  };
  businessHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  notificationPreferences: {
    emailNotifications: boolean;
    whatsappNotifications: boolean;
    lowStockAlert: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      unique: true,
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
    },
    invoiceStartNumber: {
      type: Number,
      default: 1000,
    },
    invoiceAutoSequence: {
      type: Boolean,
      default: true,
    },
    invoiceColumns: {
      type: [String],
      default: ['product', 'quantity', 'price', 'tax', 'subtotal'],
    },
    taxSystem: {
      type: String,
      default: 'GST',
    },
    taxRates: {
      standard: {
        type: Number,
        default: 18,
      },
      reduced: {
        type: Number,
        default: 5,
      },
    },
    businessHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      whatsappNotifications: {
        type: Boolean,
        default: true,
      },
      lowStockAlert: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Settings ||
  mongoose.model<ISettings>('Settings', settingsSchema);

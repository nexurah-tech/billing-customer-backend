import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  tax: number;
  subtotal: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  customer: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'online' | 'credit';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  notes: string;
  shop: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'online', 'credit'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'partial'],
      default: 'unpaid',
    },
    notes: {
      type: String,
      default: '',
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

invoiceSchema.index({ shop: 1, createdAt: -1 });
invoiceSchema.index({ customer: 1, shop: 1 });
invoiceSchema.index({ shop: 1, invoiceNumber: 1 }, { unique: true });

export default mongoose.models.Invoice ||
  mongoose.model<IInvoice>('Invoice', invoiceSchema);

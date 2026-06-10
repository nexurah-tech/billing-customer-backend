import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  sku: string;
  category: mongoose.Types.ObjectId;
  unit: string;
  unitPrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  taxApplicable: boolean;
  imageUrl: string;
  shop: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: 0,
    },
    taxApplicable: {
      type: Boolean,
      default: true,
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    imageUrl: {
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

productSchema.index({ shop: 1, category: 1 });
productSchema.index({ shop: 1, sku: 1 }, { unique: true });

export default mongoose.models.Product ||
  mongoose.model<IProduct>('Product', productSchema);

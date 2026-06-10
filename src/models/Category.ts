import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description: string;
  shop: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
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

categorySchema.index({ shop: 1, name: 1 });

export default mongoose.models.Category ||
  mongoose.model<ICategory>('Category', categorySchema);

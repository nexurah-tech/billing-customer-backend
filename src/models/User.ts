import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  shop: mongoose.Types.ObjectId;
  role: 'owner' | 'staff';
  status: 'pending' | 'active' | 'blocked' | 'inactive' | 'rejected';
  blockReason?: string;
  resetOtp?: string;
  resetOtpExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    name: {
      type: String,
      required: true,
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'staff'],
      default: 'staff',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'blocked', 'inactive', 'rejected'],
      default: 'pending',
    },
    blockReason: {
      type: String,
      default: '',
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);

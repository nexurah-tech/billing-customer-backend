import mongoose from 'mongoose';
import '../models/Shop';
import '../models/User';
import '../models/Category';
import '../models/Product';
import '../models/Customer';
import '../models/Invoice';
import '../models/Settings';
import '../models/WhatsAppMessage';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global as any;

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.mongoose.conn) {
    return cached.mongoose.conn;
  }

  if (!cached.mongoose.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.mongoose.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      });
  }
  cached.mongoose.conn = await cached.mongoose.promise;
  return cached.mongoose.conn;
}

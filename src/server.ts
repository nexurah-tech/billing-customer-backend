import dotenv from 'dotenv';
// Load environment variables before importing other modules
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db';

// Import routers
import authRouter from './routes/auth';
import shopRouter from './routes/shop';
import settingsRouter from './routes/settings';
import categoriesRouter from './routes/categories';
import productsRouter from './routes/products';
import customersRouter from './routes/customers';
import invoicesRouter from './routes/invoices';
import notificationsRouter from './routes/notifications';
import uploadRouter from './routes/upload';
import analyticsRouter from './routes/analytics';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity, can be locked down in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route registrations
app.use('/api/auth', authRouter);
app.use('/api/shop', shopRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/analytics', analyticsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server after connecting to database
async function startServer() {
  try {
    console.log('Connecting to MongoDB database...');
    await connectDB();
    console.log('MongoDB database connected successfully.');

    app.listen(PORT, () => {
      console.log(`NexBilling backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  }
}

startServer();

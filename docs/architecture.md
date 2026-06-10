# System Architecture

## Overview
NexBilling is a comprehensive billing and retail management system designed with a modern decoupled architecture. The system consists of:
1. **Frontend (Electron/Next.js)**: A standalone desktop application for retailers/cashiers.
2. **Web Admin Dashboard**: For system administrators and centralized management.
3. **Backend API (Node.js/Express)**: A standalone RESTful API serving both frontends, acting as the single source of truth.

## Tech Stack
- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (via Mongoose)
- **Deployment**: Vercel (Serverless Functions)

## Key Components

### 1. Request Handling Layer
- Configured with `cors` and `express.json` to handle cross-origin API calls from the Next.js frontends and Electron app.
- Middleware handles authentication, verifying JSON Web Tokens (JWT) attached to the `Authorization` header.

### 2. Controller & Routing Layer
- Structured using Express routers (`src/routes/`). Each domain (e.g., Auth, Products, Invoices) has an isolated router ensuring clean separation of concerns.

### 3. Data Access Layer
- Implemented with Mongoose schemas and models (`src/models/`). 
- Handles direct interaction with MongoDB.
- Includes automatic timestamping and data validation at the schema level.

### 4. External Integrations
- **Cloudinary**: Used for image/asset uploads (managed via `src/routes/upload.ts` and `multer`).
- **Twilio**: For sending SMS and WhatsApp notifications to customers upon invoice generation.
- **Nodemailer**: For sending email receipts and notifications.

## Deployment Strategy
The backend is configured to be deployed as serverless functions on Vercel:
- `vercel.json` routes all traffic through `src/server.ts`.
- `connectDB` is cached and optimized to handle cold-starts and connection pooling in a serverless environment.

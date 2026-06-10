# Application Workflow

This document describes the standard workflows and data pipelines within the NexBilling system.

## 1. Onboarding Workflow
1. **Registration**: An admin signs up via the Next.js web dashboard or Electron app (`POST /api/auth/register`).
2. **Shop Initialization**: A `Shop` document is automatically created and associated with the admin.
3. **Settings Configuration**: Admin sets up global settings, tax rates, and default SMS/Email preferences (`PUT /api/settings`).

## 2. Inventory Management Workflow
1. **Categorization**: Admin adds product categories (e.g., "Beverages", "Electronics") via `POST /api/categories`.
2. **Product Addition**: Admin adds products containing details like SKU, barcode, price, and initial stock level (`POST /api/products`). Images can be uploaded concurrently via the `/api/upload` endpoint.
3. **Stock Updates**: Whenever stock runs low, the admin updates the inventory manually, or it is updated automatically via the purchasing workflow.

## 3. Standard Checkout Workflow (Point of Sale)
1. **Cart Assembly**: A cashier adds products to the customer's cart via the Electron app frontend. Products are queried quickly via the `/api/products` endpoints.
2. **Customer Identification (Optional)**: The cashier selects an existing customer or creates a new one on the fly (`POST /api/customers`).
3. **Invoice Generation**: The cashier clicks "Checkout" which triggers a `POST /api/invoices` request to the backend.
   - **Backend Processing**: 
     - Validates product stock and pricing.
     - Creates the `Invoice` document in MongoDB.
     - Loops over the line items and **deducts stock** from the respective `Product` documents.
     - Logs the payment method in the `Payment` collection.
4. **Receipt Dispatch**: The backend utilizes Twilio/Nodemailer to send a digital receipt (via SMS, WhatsApp, or Email) to the customer based on the shop's notification settings.

## 4. Analytics & Reporting Workflow
1. The dashboard polls `/api/analytics/dashboard`.
2. The backend aggregates data using MongoDB Aggregation Pipelines across the `Invoices`, `Products`, and `Customers` collections.
3. Returns formatted statistics to render revenue charts, top-selling products, and low-stock alerts on the frontend.

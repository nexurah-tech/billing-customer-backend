# API Documentation

The NexBilling Backend provides a RESTful API. All endpoints are prefixed with `/api`. Most endpoints require an `Authorization` header with a valid Bearer token, except for authentication routes.

## Endpoints

### 1. Authentication (`/api/auth`)
- `POST /register`: Register a new user/admin and initialize a shop.
- `POST /login`: Authenticate an existing user and return a JWT token.
- `GET /me`: Retrieve the currently authenticated user's profile.

### 2. Shop Management (`/api/shop`)
- `GET /`: Get the details of the authenticated user's shop.
- `PUT /`: Update shop details (name, address, tax configuration, etc.).

### 3. Products & Inventory (`/api/products` & `/api/categories`)
- `GET /api/categories`: Retrieve all categories for the shop.
- `POST /api/categories`: Create a new category.
- `GET /api/products`: Retrieve the shop's product inventory. Supports pagination and filtering.
- `POST /api/products`: Add a new product to the inventory.
- `PUT /api/products/:id`: Update a product (price, stock, barcode, etc.).
- `DELETE /api/products/:id`: Remove a product.

### 4. Customers (`/api/customers`)
- `GET /`: Retrieve the list of customers.
- `POST /`: Register a new customer (name, phone, email, etc.).
- `GET /:id/history`: Get the purchase history of a specific customer.

### 5. Invoicing & Billing (`/api/invoices`)
- `GET /`: Get all invoices (useful for history and ledgers).
- `POST /`: Generate a new invoice. This endpoint handles:
  - Deducting stock from the purchased products.
  - Recording the sale against the customer's profile.
  - Triggering notifications (SMS/Email/WhatsApp) if configured.
- `GET /:id`: Retrieve a specific invoice by its ID.

### 6. Analytics (`/api/analytics`)
- `GET /dashboard`: Aggregated data for the dashboard (e.g., total sales today, low stock alerts, revenue over time).

### 7. File Uploads (`/api/upload`)
- `POST /`: Upload an image (e.g., product image, shop logo) using `multipart/form-data`. Returns the secure URL provided by Cloudinary.

### 8. Notifications (`/api/notifications`)
- `GET /`: Retrieve unread system notifications for the admin/retailer.
- `PUT /:id/read`: Mark a notification as read.

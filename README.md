# 🌿 EcoMart — Sustainable Products Marketplace

EcoMart is a full-stack sustainable-products marketplace connecting **Customers**, **Vendors**, and **Admins**. It features live Eco-Score computation, carbon/plastic impact tracking, Green Rewards points & catalog redemption, multi-language i18n support (English, Hindi, Tamil), AI Eco Assistant bot with Gemini, Razorpay payments integration, and location services.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, React Router DOM 6, Custom CSS Design System, i18next (English / Hindi / Tamil).
- **Backend**: Node.js ESM, Express 4, JWT Authentication, Rate Limiting, Multer File Uploads.
- **Persistence**: MySQL with automatic JSON file store fallback (`backend/data_store.json`), supporting atomic file writes.
- **Integrations**:
  - **Razorpay API**: Orders & Signature Verification (`/api/payments/*`)
  - **Google Gemini API**: Product Sustainability Assistant, Image Scan & Explainer (`/api/ai/*`)
  - **Nodemailer / SMTP**: Verification & Password Reset OTP (`/api/auth/*`)
  - **Location Services**: GeoNames, Nominatim, & Mapbox.

---

## 🔒 Security & Authorization Highlights

1. **Role-Based Access Control (RBAC)**: Protected non-public routes using `authenticateToken` and `requireRole("admin" | "vendor" | "customer")`.
2. **Strict Ownership Checks**: Customers can only view their own orders; vendors can only view analytics and modify products belonging to their store.
3. **Secret Isolation**: All credentials are parameterized in `.env`. Default fallback secrets have been completely removed.
4. **Password Security**: Automatic migration of legacy plaintext credentials to bcrypt hashes upon successful authentication.
5. **Centralized API Client**: All frontend requests flow through [`src/services/api.js`](file:///c:/Users/KRISHNA/EcoMart/src/services/api.js) with automatic `Authorization: Bearer <token>` injection.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### 2. Installation
Install root dependencies and backend dependencies:
```bash
npm install
npm install --prefix backend
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key environment variables:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secure_jwt_secret_key_here
ADMIN_EMAIL=admin@ecomart.com
ADMIN_PASSWORD=Admin@12345

# Database Configuration (MySQL optional; falls back to JSON file store)
DB_TYPE=json
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=ecomart

# Optional Integrations
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## 🏃 Running the Application

### Concurrent Development Server (Backend + Frontend)
```bash
npm run dev
```
Starts Express API on `http://localhost:5000` and Vite dev server on `http://localhost:5173`.

### Backend API Server Only
```bash
npm run backend
```

### Frontend Only
```bash
npm run frontend
```

---

## 🧪 Testing & Verification Commands

### Run Automated API & E2E Test Suite
Runs the 15-point integration test suite verifying health, authentication, RBAC authorization, product approvals, order placement, and eco-dashboards:
```bash
npm test
```

### Run Linter
Executes ESLint across backend and frontend code:
```bash
npm run lint
```

### Run Production Build
Builds optimized production assets into `dist/`:
```bash
npm run build
```

---

## 🔑 Seed Test Accounts

The database includes the following seeded accounts for local testing:

| Role | Email | Password | Access / Portal |
|---|---|---|---|
| **Admin** | `admin@ecomart.com` | `Admin@12345` | Platform Admin Dashboard, Vendor/Product Approvals, Coupons |
| **Vendor** | `vendor.sample@ecomart.com` | `Vendor@123` | Vendor Store Dashboard, Product Management, Order Fulfillment |
| **Customer** | `krishmessi91@gmail.com` | `krishna` | Marketplace, Cart, Checkout, Order Tracking, Eco Dashboard |

---

## 📂 Project Architecture

```
EcoMart/
├── backend/
│   ├── controllers/       # Auth, User, and Product controllers
│   ├── middleware/        # Auth (JWT/RBAC), Rate limiting, Multer upload
│   ├── routes/            # Express router modules (auth.js, ai.js, delivery.js)
│   ├── services/          # Razorpay, Location, Delivery, and AI service wrappers
│   ├── database.js        # MySQL connection & atomic JSON file store fallback engine
│   └── server.js          # Express API server entry (~1700 LOC)
├── src/
│   ├── components/        # UI components (AI Bot, ProductCard, LocationSelector, Layout)
│   ├── context/           # AuthContext, CartContext, DataContext, LanguageContext, etc.
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Admin, Vendor, Customer, and Public views
│   ├── routes/            # Protected & guarded application routes
│   └── services/          # Centralized API HTTP client (api.js)
├── AUDIT_REPORT.md        # Detailed full-stack audit and bug remediation report
└── package.json           # Application manifest and npm scripts
```

# 🌿 EcoMart — Sustainable Products Marketplace

A full-stack React + Express + SQLite e-commerce platform for sustainable, eco-friendly products, converted from an existing Farmer↔Vendor B2B marketplace codebase. Roles were remapped (Farmer → **Vendor**, Vendor → **Customer**, Admin stays **Admin**) and a sustainability layer (Eco Score, carbon impact, Green Reward Points, admin product approval, AI Eco Assistant) was added on top of the original architecture.

> **Zero fake data policy**: The database seeds only one Admin account and a starter Green Rewards coupon catalog. No demo vendors, customers, products, or orders are created. A real vendor must register and submit a product, which goes through Admin approval before it appears in the customer marketplace.

---

## 1. What Changed From the Original Project

This codebase started as a Farmer-to-Vendor B2B produce marketplace. It was converted into EcoMart as follows:

- **Role rename** across the entire codebase: `farmer` → `vendor` (seller/store), `vendor` → `customer` (buyer), folders/routes/components renamed to match (`pages/farmer` → `pages/vendor`, `pages/vendor` → `pages/customer`, `/farmer/*` → `/vendor/*`, `/vendor/*` → `/customer/*`).
- **Fixed a critical bug**: the backend's `server.js` was missing its Express app bootstrap entirely (no `express()`, no middleware, no `PORT`, no ID/sanitization helpers) — the server could not have run as originally uploaded. This has been added.
- **Sustainability layer added**: Eco Score engine (material, packaging, recyclability, renewable energy, lifespan → 0-100 score + CO2/plastic/water/tree impact estimates), computed both live in the UI and authoritatively on the backend.
- **Admin product approval workflow added**: new products default to `pending`; only `approved` products are visible in the customer Marketplace; Admin Dashboard has a new Product Approval tab (approve / reject with reason).
- **Green Reward Points & coupons added**: customers earn points per order and can redeem them for discount coupons from their Eco Dashboard; Admin can manage the coupon catalog.
- **AI Eco Assistant added**: a lightweight rule-based `/api/ai/chat` endpoint (no external API key required) answering questions about Eco Scores, rewards, shipping, and more.
- **Removed fabricated data**: a demo auto-login mechanism, a "My Farm" page that displayed entirely fictional soil/plot/satellite-survey data, fake fallback vendor names/ratings in the Marketplace, and hardcoded "5.0 rating" / "Verified" badges shown regardless of real status. Replaced with real-data equivalents (a proper "My Store" page driven by the vendor's actual products and profile).
- **Copy pass**: category taxonomy, product form, product cards, dashboards, and marketing copy updated from farm-produce language to sustainable-goods language.
- Bulk/wholesale pricing tiers, location services (country/region/district lookup + map), multi-language i18n (English/Hindi/Tamil), reviews, and notifications were **preserved as-is** since they already worked and are valuable general-purpose e-commerce features.

---

## 2. Project Structure

```
EcoMart/
├── backend/
│   ├── server.js           # Express API (all /api/* routes, Eco Score engine, AI assistant)
│   ├── database.js         # SQLite schema, migrations, admin-only seeding
│   ├── services/
│   │   └── locationService.js  # Country/region/district lookups, geocoding
│   └── package.json
└── src/
    ├── components/
    │   ├── common/          # Design system: Button, Card, Modal, FormField, MapBoxView, etc.
    │   ├── layout/           # Navbar, Sidebar, Footer, PublicHeader
    │   └── product/          # ProductCard, ProductForm (with live Eco Score preview)
    ├── context/              # AuthContext, CartContext, DataContext, LanguageContext, NotificationContext
    ├── hooks/                # useAuth, useCart, useData, useLanguage, useNotifications, ...
    ├── pages/
    │   ├── public/           # LandingPage, Login, Register, VendorProfile, Support, ForgotPassword
    │   ├── vendor/           # VendorDashboard, MyStore, MyProducts, VendorOrders
    │   ├── customer/         # CustomerDashboard (Eco Dashboard), Marketplace, ProductDetails, Cart, Wishlist, Checkout, OrderHistory, OrderTracking
    │   ├── admin/            # AdminDashboard (users, vendor verification, product approval, orders, coupons)
    │   └── common/           # ProfileSettings
    ├── routes/AppRoutes.jsx  # Role-guarded routing
    ├── locales/              # en.json, hi.json, ta.json (i18n)
    └── utils/constants.js    # Categories, Eco Score engine, units, statuses
```

---

## 3. Prerequisites

- **Node.js** 18+ and npm
- No external database server needed — this project uses **SQLite** (a single file, `backend/database.sqlite`, created automatically on first run).

---

## 4. Environment Variables

Copy `.env.example` to `.env` in the project root and adjust as needed:

```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
GEONAMES_USERNAME=your_geonames_username
ADMIN_EMAIL=admin@ecomart.com
ADMIN_PASSWORD=Admin@12345
PORT=5000
```

- `VITE_MAPBOX_ACCESS_TOKEN` / `GEONAMES_USERNAME` — optional; only needed for live map rendering and location autocomplete. The app runs without them (map falls back gracefully).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — used **once** by the database seeder to create the first Admin login. Change the password after first login in production.
- `PORT` — backend Express port (defaults to `5000` if unset).

---

## 5. Installation & Setup

### Step 1 — Install frontend dependencies
```bash
npm install
```

### Step 2 — Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### Step 3 — Start the backend
```bash
npm run backend
```
This runs the Express API on `http://localhost:5000`. On first run it automatically creates `backend/database.sqlite`, builds all tables, and seeds **only**:
- One Admin account (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, defaults shown above if unset)
- A starter Green Rewards coupon catalog (`ECOFIRST15`, `GREENHERO25`, `FREESHIPECO`)

No fake vendors, customers, or products are created — the marketplace starts completely empty.

### Step 4 — Start the frontend (in a new terminal, from the project root)
```bash
npm run dev
```
The app runs on `http://localhost:5173` and proxies all `/api/*` calls to the backend on port 5000 (see `vite.config.js`).

### Step 5 — Log in as Admin
Use the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (or the defaults above) to sign in and approve the first real vendor's products.

---

## 6. Real End-to-End Workflow (no fake data anywhere)

1. **Register a Vendor** — Register -> choose Vendor -> fill in store name & location.
2. **Vendor adds a product** — Vendor Dashboard -> My Products -> Add Product -> fill in material, packaging, recyclability, and renewable-energy details. A live Eco Score is calculated as you type. The product saves with `status: pending`.
3. **Admin approves** — log in as Admin -> Products tab -> Approve (or Reject with a reason).
4. **Product goes live** — once approved, the product appears in the Customer Marketplace.
5. **Register a Customer** — sign up, browse the Marketplace, filter/sort by category, price, or Eco Score, add to Cart/Wishlist.
6. **Checkout** — place an order; the customer earns real Green Reward Points (1 point per ₹100 spent, minimum 10).
7. **Track & review** — Order Tracking shows live status; customers can leave reviews on delivered products.
8. **Eco Dashboard** — customers see their real cumulative CO2 saved, plastic avoided, water saved, and can redeem Green Points for coupons.
9. **Admin oversight** — Admin Dashboard shows real platform stats, vendor verification, order monitoring, and coupon management — all computed from the live SQLite database.

---

## 7. Roles & Feature Summary

| Role | Capabilities |
|------|-------------|
| **Customer** | Register/login, profile, browse/search/filter/sort marketplace (incl. by Eco Score), product details with Eco Score & carbon impact, wishlist, cart, checkout, order history & live tracking, reviews, Green Reward Points & coupon redemption, Eco Dashboard, notifications, AI Eco Assistant |
| **Vendor** | Register/login, store profile & location, dashboard with real stats, add/edit/delete products (with live Eco Score preview, bulk pricing tiers, inventory), view orders containing their products, view product reviews |
| **Admin** | Login, platform dashboard with real aggregate stats, user management, vendor verification, **product approval queue** (approve/reject with reason), order monitoring, Green Rewards coupon management, notifications |

---

## 8. What Was Tested

- Full frontend production build (`vite build`) completes with no errors
- Backend (`server.js`, `database.js`) pass `node --check` syntax validation
- Lint pass (`oxlint`) shows 0 errors (only pre-existing minor unused-import warnings, unrelated to this conversion)
- **Live end-to-end flows** (register -> vendor product -> admin approval -> checkout -> rewards) were verified via careful manual code-path review (request/response shapes, SQL column names, endpoint wiring) rather than a live browser run, due to sandbox constraints during development. Please run through the workflow in Section 6 yourself after setup to confirm behavior in your own environment.

---

## 9. Tech Stack

- **Frontend**: React 18, React Router, custom design system (CSS variables), Lucide-style icon set, i18n (English/Hindi/Tamil)
- **Backend**: Node.js, Express, SQLite3 (file-based, zero external DB server)
- **Dev tooling**: Vite, ESLint/oxlint

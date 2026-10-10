# 🚀 EcoMart Live Deployment Guide

This guide provides end-to-end instructions for deploying the **EcoMart Sustainable Marketplace** to production for free.

---

## 📋 Overview of Deployment Methods

| Method | Best For | Complexity | Cost | Domain Setup |
| :--- | :--- | :--- | :--- | :--- |
| **Method 1: Render All-in-One** *(Recommended)* | Express + Vite Fullstack in one service | Easiest (1 Click) | 100% Free | 1 URL (No CORS issues) |
| **Method 2: Decoupled (Vercel + Render)** | High-traffic frontend on edge CDN | Medium | 100% Free | 2 URLs (Vercel + Render) |
| **Method 3: Railway / Docker / VPS** | Production containers / DigitalOcean | Intermediate | Free trial / Paid | Custom domain |

---

## 🌟 Method 1: Render Full-Stack Web Service (Recommended & Simplest)

In this approach, Render builds your React frontend (`npm run build`) and runs your Express API (`npm start`). Express automatically serves the static React application from `/dist`, handling all frontend routing and backend `/api/*` endpoints from a single live URL with zero CORS configuration required.

### Step 1: Create a Render Account
1. Go to [https://render.com](https://render.com) and sign up with your GitHub account.

### Step 2: Create a New Web Service
1. In the Render Dashboard, click **New +** → **Web Service**.
2. Connect your repository: `krishmessi14-zenso/Ecomart`.
3. Configure the service settings:
   - **Name**: `ecomart-marketplace` (or your choice)
   - **Region**: Choose the closest region (e.g., `Singapore` or `Frankfurt` or `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: Leave empty (root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm install --prefix backend && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`

### Step 3: Add Environment Variables
Under the **Environment Variables** section, add the following key-value pairs:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `JWT_SECRET` | *(Click "Generate" or enter a long random string)* | Used for signing auth tokens |
| `DB_TYPE` | `json` *(or `mysql` if using cloud database)* | Database storage driver |
| `ADMIN_EMAIL` | `admin@ecomart.com` | Default admin email |
| `ADMIN_PASSWORD` | `Admin@12345` | Secure admin password |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
| `RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | `...` | Razorpay Key Secret |
| `EMAIL_USER` | `youremail@gmail.com` | Gmail account for OTP emails |
| `EMAIL_PASS` | `abcd efgh ijkl mnop` | Gmail App Password (16 characters) |

*(Optional Location Variables)*:
- `VITE_MAPBOX_ACCESS_TOKEN`: *(Optional)* Your Mapbox token.
- `GEONAMES_USERNAME`: *(Optional)* Your GeoNames API username.

### Step 4: Deploy
1. Click **Deploy Web Service**.
2. Render will run the build command, compile the Vite React app, install dependencies, and start Express.
3. Once the logs show:
   ```
   ✅ EcoMart Database initialization complete.
   Backend Express server listening at http://localhost:10000
   ```
4. Click your live URL (e.g. `https://ecomart-marketplace.onrender.com`) to open your live marketplace!

---

## ⚡ Method 2: Decoupled (Vercel Frontend + Render Backend)

If you prefer having your Vite React frontend deployed on Vercel's global CDN:

### Part A: Deploy Backend on Render
1. Go to [Render](https://render.com) → **New +** → **Web Service**.
2. Select your repository `krishmessi14-zenso/Ecomart`.
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables:
   - `JWT_SECRET`: *(Random secret)*
   - `DB_TYPE`: `json` (or `mysql`)
   - `ADMIN_EMAIL`: `admin@ecomart.com`
   - `ADMIN_PASSWORD`: `Admin@12345`
   - `CLIENT_URL`: `https://your-ecomart-app.vercel.app` *(Your Vercel URL)*
   - `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, etc.
5. Deploy and copy your backend URL (e.g., `https://ecomart-backend.onrender.com`).

### Part B: Deploy Frontend on Vercel
1. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project** and select `krishmessi14-zenso/Ecomart`.
3. Framework Preset: **Vite**.
4. Root Directory: `./` (Root).
5. Build Command: `npm run build` (Output Directory: `dist`).
6. Update `vercel.json` rewrites to proxy `/api` and `/uploads` to your Render backend URL:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://ecomart-backend.onrender.com/api/$1" },
       { "source": "/uploads/(.*)", "destination": "https://ecomart-backend.onrender.com/uploads/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
7. Click **Deploy**. Your Vercel frontend is live!

---

## 🗄️ Database Options in Production

EcoMart supports two database backends:

### Option A: Built-in Persistent JSON Store (`DB_TYPE=json`)
- **Setup time**: 0 minutes (Default).
- Works automatically without provisioning any database servers.
- Automatically initializes with sample categories, products, vendor stores, and default admin credentials.
- *Note*: On Render's Free tier, services spin down after 15 minutes of inactivity; newly created records may reset on cold redeployment unless a persistent disk or cloud database is attached.

### Option B: Free Cloud MySQL Database (`DB_TYPE=mysql`)
For a persistent, production-grade relational database:
1. **Aiven for MySQL** (Free Tier):
   - Sign up at [https://aiven.io](https://aiven.io).
   - Create a free MySQL service (free forever, 5 GB storage).
   - Copy the `Service URI` or Host, Port, User, Password, and Database Name.
2. **TiDB Cloud** (Free Serverless MySQL):
   - Sign up at [https://tidbcloud.com](https://tidbcloud.com) (5 GB free storage forever).
   - Create a Serverless cluster and obtain connection credentials.
3. In your Render / hosting environment variables, add:
   ```env
   DB_TYPE=mysql
   DB_HOST=<cloud-mysql-host>
   DB_PORT=<cloud-mysql-port>
   DB_USER=<cloud-mysql-user>
   DB_PASSWORD=<cloud-mysql-password>
   DB_NAME=<cloud-database-name>
   ```
   *EcoMart automatically executes all SQL table migrations and seed scripts on boot!*

---

## 🔑 Integrations Setup Guide

### 1. Google Gemini API (AI Bot & Eco Scanner)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key**.
3. Set `GEMINI_API_KEY` in your live host environment variables.

### 2. Razorpay Payment Gateway (Checkout)
1. Sign up at [https://razorpay.com](https://razorpay.com).
2. Go to **Settings** → **API Keys** → Generate **Test Key**.
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

### 3. Gmail SMTP OTP (Email Verification & Password Reset)
1. Go to your Google Account → **Security** → Enable **2-Step Verification**.
2. Search for **App Passwords** ([https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
3. Generate a password for "Mail" / "EcoMart".
4. Set:
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   ```

---

## ✅ Post-Deployment Verification Checklist

Once your app is live:

1. **Check API Health**:
   Visit `https://<your-live-url>/api/health` — it should return:
   ```json
   { "status": "ok", "service": "EcoMart Backend API", "database": "json-file" }
   ```
2. **Admin Login**:
   - Go to `https://<your-live-url>/login`.
   - Log in with `admin@ecomart.com` and `Admin@12345` (or your configured credentials).
   - Check the **Admin Dashboard** and verify stats and moderation tabs load.
3. **Customer Registration & Browsing**:
   - Register a new customer account or test login.
   - Browse the **Marketplace**, filter by categories and eco-score.
   - Add items to Cart and proceed to Checkout.
4. **AI Features**:
   - Click the bottom-right AI Chatbot bubble and ask sustainability questions.
   - Test the Product Scanner at `/scan`.

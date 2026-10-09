import fs from "fs";

let fileContent = fs.readFileSync("backend/server.js", "utf8");

// Re-write top section
const newTopImports = `import express from "express";
import cors from "cors";
import { query } from "./database.js";
import {
  getCountries,
  getRegions,
  getDistricts,
  getPlaces,
  searchLocations,
  reverseGeocode
} from "./services/locationService.js";
import {
  isRazorpayConfigured,
  getRazorpayKeyId,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./services/razorpayService.js";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import deliveryRoutes from "./routes/delivery.js";
import { uploadProductImage } from "./middleware/multer.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({ origin: [clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"], credentials: true }));

// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Webhook raw body parser
app.use("/api/payments/razorpay-webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/api", apiRateLimiter);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "EcoMart Backend API", timestamp: new Date().toISOString() });
});

// Mount Routers
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/delivery", deliveryRoutes);

// Image Upload Endpoint
app.post("/api/upload/product", authenticateToken, requireRole("vendor", "admin"), uploadProductImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }
  const imageUrl = "/uploads/products/" + req.file.filename;
  res.json({ success: true, imageUrl, filename: req.file.filename });
});`;

const splitIdx = fileContent.indexOf("// ---------------- ID / SANITIZATION HELPERS ----------------");
if (splitIdx !== -1) {
  fileContent = newTopImports + "\n\n" + fileContent.slice(splitIdx);
}

// Remove legacy shadowed inline auth routes block
const legacyAuthStart = fileContent.indexOf("// ---------------- AUTH ROUTES ----------------");
const legacyAuthEnd = fileContent.indexOf("// ---------------- RAZORPAY & VENDOR PAYOUT ROUTES ----------------");
if (legacyAuthStart !== -1 && legacyAuthEnd !== -1) {
  fileContent = fileContent.slice(0, legacyAuthStart) + fileContent.slice(legacyAuthEnd);
}

// Update route middlewares for user, vendor, admin, order, payments, reviews, coupons
fileContent = fileContent.replace(
  'app.put("/api/users/:id/payout-settings", async (req, res) => {',
  'app.put("/api/users/:id/payout-settings", authenticateToken, async (req, res) => {\n  if (req.user.id !== req.params.id && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });'
);

fileContent = fileContent.replace(
  'app.put("/api/users/:id", async (req, res) => {',
  'app.put("/api/users/:id", authenticateToken, async (req, res) => {\n  if (req.user.id !== req.params.id && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });'
);

fileContent = fileContent.replace(
  'app.get("/api/users", async (req, res) => {',
  'app.get("/api/users", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/admin/vendors", async (req, res) => {',
  'app.get("/api/admin/vendors", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/admin/vendors/:id/approval", async (req, res) => {',
  'app.put("/api/admin/vendors/:id/approval", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/admin/products/pending", async (req, res) => {',
  'app.get("/api/admin/products/pending", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/users/:id/verification", async (req, res) => {',
  'app.put("/api/users/:id/verification", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/products", handleCreateProduct);',
  'app.post("/api/products", authenticateToken, requireRole("vendor", "admin"), handleCreateProduct);'
);

fileContent = fileContent.replace(
  'app.post("/api/vendor/products", handleCreateProduct);',
  'app.post("/api/vendor/products", authenticateToken, requireRole("vendor", "admin"), handleCreateProduct);'
);

fileContent = fileContent.replace(
  'app.get("/api/vendor/products", async (req, res) => {',
  'app.get("/api/vendor/products", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/products/:id", async (req, res) => {',
  'app.put("/api/products/:id", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/products/:id/approval", async (req, res) => {',
  'app.put("/api/products/:id/approval", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.delete("/api/products/:id", async (req, res) => {',
  'app.delete("/api/products/:id", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/payments/create-razorpay-order", async (req, res) => {',
  'app.post("/api/payments/create-razorpay-order", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/payments/verify-razorpay-payment", async (req, res) => {',
  'app.post("/api/payments/verify-razorpay-payment", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/payments/cancel-razorpay-payment", async (req, res) => {',
  'app.post("/api/payments/cancel-razorpay-payment", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/orders/:id/payment", async (req, res) => {',
  'app.get("/api/orders/:id/payment", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/orders", async (req, res) => {',
  'app.get("/api/orders", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/orders", async (req, res) => {',
  'app.post("/api/orders", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/orders/:id", async (req, res) => {',
  'app.put("/api/orders/:id", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/notifications", async (req, res) => {',
  'app.get("/api/notifications", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/notifications", async (req, res) => {',
  'app.post("/api/notifications", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/notifications/read-all", async (req, res) => {',
  'app.put("/api/notifications/read-all", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.put("/api/notifications/:id/read", async (req, res) => {',
  'app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/reviews", async (req, res) => {',
  'app.post("/api/reviews", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.delete("/api/reviews/:id", async (req, res) => {',
  'app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/reports/vendor/:vendorId", async (req, res) => {',
  'app.get("/api/reports/vendor/:vendorId", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {\n  if (req.user.id !== req.params.vendorId && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });'
);

fileContent = fileContent.replace(
  'app.post("/api/coupons", async (req, res) => {',
  'app.post("/api/coupons", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.delete("/api/coupons/:id", async (req, res) => {',
  'app.delete("/api/coupons/:id", authenticateToken, requireRole("admin"), async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.post("/api/coupons/:id/redeem", async (req, res) => {',
  'app.post("/api/coupons/:id/redeem", authenticateToken, async (req, res) => {'
);

fileContent = fileContent.replace(
  'app.get("/api/customer/eco-dashboard", async (req, res) => {',
  'app.get("/api/customer/eco-dashboard", authenticateToken, async (req, res) => {'
);

// Append global Express error handler & process unhandledRejection
const globalErrorHandler = `

// Global Express Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Global express error handler caught:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
});
`;

if (!fileContent.includes("Global Express Error Handler")) {
  fileContent += globalErrorHandler;
}

fs.writeFileSync("backend/server.js", fileContent);
console.log("server.js updated successfully!");

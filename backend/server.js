import express from "express";
import cors from "cors";
import { query, getDbMode } from "./database.js";
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
import fs from "fs";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import deliveryRoutes from "./routes/delivery.js";
import scanRoutes from "./routes/scan.js";
import offersRoutes from "./routes/offers.js";
import { uploadProductImage } from "./middleware/multer.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === clientUrl ||
        origin === "http://localhost:5173" ||
        origin === "http://127.0.0.1:5173" ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".railway.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Webhook raw body parser
app.use("/api/payments/razorpay-webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/api", apiRateLimiter);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "EcoMart Backend API", database: getDbMode(), timestamp: new Date().toISOString() });
});

// Mount Routers
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", aiRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/offers", offersRoutes);

// Image Upload Endpoint
app.post("/api/upload/product", authenticateToken, requireRole("vendor", "admin"), uploadProductImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }
  const imageUrl = "/uploads/products/" + req.file.filename;
  res.json({ success: true, imageUrl, filename: req.file.filename });
});

// ---------------- ID / SANITIZATION HELPERS ----------------

// Generate a reasonably-unique, prefix-tagged id (e.g. "p1a2b3c4d")
function generateId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Strip sensitive fields before sending a user record to the client
function sanitizeUser(user) {
  if (!user) return null;
  const { password, securityAnswer, ...safeUser } = user;
  return safeUser;
}

// Normalize common email domain typos (e.g. gmail.coom -> gmail.com)
function normalizeEmailDomain(email) {
  if (!email || typeof email !== "string") return email;
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed;

  const localPart = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  // Fix common TLD typos
  domain = domain.replace(/\.(coom|comm|cmo|con|cm)$/i, ".com");
  domain = domain.replace(/\.orgg$/i, ".org");
  domain = domain.replace(/\.nett$/i, ".net");

  // Fix common domain provider typos
  if (/^g(ma|am|mai|mial|mail)l?\.(com|coom|con|cm)$/i.test(domain)) {
    domain = "gmail.com";
  } else if (/^hotm(ai|ia|ail)\.(com|coom|con|cm)$/i.test(domain)) {
    domain = "hotmail.com";
  } else if (/^outl(oo|o)k\.(com|coom|con|cm)$/i.test(domain)) {
    domain = "outlook.com";
  } else if (/^yah(oo|o)\.(com|coom|con|cm)$/i.test(domain)) {
    domain = "yahoo.com";
  }

  return `${localPart}@${domain}`;
}

// ---------------- ECO SCORE ENGINE ----------------

const MATERIAL_POINTS = {
  bamboo: 30, organic: 28, recycled: 28, steel: 26, glass: 24, biodegradable: 25, standard: 12
};
const PACKAGING_POINTS = {
  plastic_free: 20, compostable: 20, recycled_paper: 16, minimal_plastic: 8
};

// Compute a 0-100 Eco Score plus per-unit carbon/impact metrics from sustainability attributes
function computeEcoMetrics({ materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears }) {
  const materialPts = MATERIAL_POINTS[materialType] ?? 15;
  const packagingPts = PACKAGING_POINTS[packagingType] ?? 10;
  const recyclabilityPts = Math.min(20, (Number(recyclability || 80) / 100) * 20);
  const energyPts = isRenewableEnergy ? 20 : 10;
  const lifespanPts = Math.min(10, Number(lifespanYears || 2) * 2.5);
  const ecoScore = Math.round(materialPts + packagingPts + recyclabilityPts + energyPts + lifespanPts);

  const factor = ecoScore / 100;
  return {
    ecoScore,
    co2SavedKg: parseFloat((factor * 3.5).toFixed(2)),
    plasticSavedKg: parseFloat((factor * 0.45).toFixed(2)),
    waterSavedLiters: Math.round(factor * 120),
    treesEquivalent: parseFloat((factor * 0.15).toFixed(2))
  };
}

// ---------------- LOCATION ROUTES ----------------

// GET /api/locations/countries
app.get("/api/locations/countries", async (req, res) => {
  try {
    const countries = await getCountries();
    res.json(countries);
  } catch (err) {
    console.error("Fetch countries error:", err);
    res.status(500).json({ error: "Failed to fetch countries." });
  }
});

// GET /api/locations/regions/:countryCode
app.get("/api/locations/regions/:countryCode", async (req, res) => {
  const { countryCode } = req.params;
  try {
    const regions = await getRegions(countryCode);
    res.json(regions);
  } catch (err) {
    console.error("Fetch regions error:", err);
    res.status(500).json({ error: "Failed to fetch regions." });
  }
});

// GET /api/locations/districts/:countryCode/:regionCode
app.get("/api/locations/districts/:countryCode/:regionCode", async (req, res) => {
  const { countryCode, regionCode } = req.params;
  try {
    const districts = await getDistricts(countryCode, regionCode);
    res.json(districts);
  } catch (err) {
    console.error("Fetch districts error:", err);
    res.status(500).json({ error: "Failed to fetch districts." });
  }
});

// GET /api/locations/places/:countryCode/:regionCode/:districtCode
app.get("/api/locations/places/:countryCode/:regionCode/:districtCode", async (req, res) => {
  const { countryCode, regionCode, districtCode } = req.params;
  try {
    const places = await getPlaces(countryCode, regionCode, districtCode);
    res.json(places);
  } catch (err) {
    console.error("Fetch places error:", err);
    res.status(500).json({ error: "Failed to fetch places." });
  }
});

// GET /api/locations/search?q=&countryCode=
app.get("/api/locations/search", async (req, res) => {
  const { q, countryCode } = req.query;
  try {
    const results = await searchLocations(q || "", countryCode || "");
    res.json(results);
  } catch (err) {
    console.error("Location search error:", err);
    res.status(500).json({ error: "Failed to search locations." });
  }
});

// GET /api/locations/reverse-geocode?lat=&lng=
app.get("/api/locations/reverse-geocode", async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json(result);
  } catch (err) {
    console.error("Reverse geocode error:", err);
    res.status(500).json({ error: "Failed to reverse geocode." });
  }
});

// ---------------- RAZORPAY & VENDOR PAYOUT ROUTES ----------------

// PUT /api/users/:id/payout-settings
app.put("/api/users/:id/payout-settings", authenticateToken, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });
  const { id } = req.params;
  const { upiId, accountHolderName, accountNumber, ifscCode, panNumber, gstin } = req.body;

  try {
    const existing = await query.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: "User not found." });
    }

    await query.run(
      `UPDATE users SET
        upiId = ?,
        accountHolderName = ?,
        accountNumber = ?,
        ifscCode = ?,
        panNumber = ?,
        gstin = ?
      WHERE id = ?`,
      [
        upiId ? upiId.trim() : null,
        accountHolderName ? accountHolderName.trim() : null,
        accountNumber ? accountNumber.trim() : null,
        ifscCode ? ifscCode.trim() : null,
        panNumber ? panNumber.trim() : null,
        gstin ? gstin.trim() : null,
        id,
      ]
    );

    const updatedUser = await query.get("SELECT * FROM users WHERE id = ?", [id]);
    res.json(sanitizeUser(updatedUser));
  } catch (err) {
    console.error("Update vendor payout settings error:", err);
    res.status(500).json({ error: "Failed to update vendor payout settings." });
  }
});



// PUT /api/users/:id
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });
  const { id } = req.params;
  const { name, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, password, about } = req.body;

  try {
    const user = await query.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const safeTrim = (val) => (typeof val === "string" ? val.trim() : val);

    await query.run(
      `UPDATE users 
       SET name = ?, storeName = ?, countryCode = ?, countryName = ?, region = ?, district = ?, city = ?, postalCode = ?, lat = ?, lng = ?, currency = ?, password = ?, about = ?
       WHERE id = ?`,
      [
        name !== undefined && name !== null ? safeTrim(name) : user.name,
        storeName !== undefined ? safeTrim(storeName) : user.storeName,
        countryCode !== undefined ? countryCode : user.countryCode,
        countryName !== undefined ? countryName : user.countryName,
        region !== undefined ? safeTrim(region) : user.region,
        district !== undefined ? safeTrim(district) : user.district,
        city !== undefined ? safeTrim(city) : user.city,
        postalCode !== undefined ? safeTrim(postalCode) : user.postalCode,
        lat !== undefined && lat !== null ? parseFloat(lat) : user.lat,
        lng !== undefined && lng !== null ? parseFloat(lng) : user.lng,
        currency !== undefined ? currency : user.currency,
        password !== undefined && password !== null && String(password).trim() !== "" ? password : user.password,
        about !== undefined ? about : user.about,
        id
      ]
    );

    const updatedUser = await query.get("SELECT * FROM users WHERE id = ?", [id]);
    res.json(sanitizeUser(updatedUser));
  } catch (err) {
    console.error("Update user database error:", err);
    res.status(500).json({ error: "Failed to update user profile." });
  }
});

// GET /api/users (For Admin)
app.get("/api/users", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const users = await query.all("SELECT * FROM users ORDER BY createdAt DESC");
    res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// GET /api/admin/vendors (Admin get pending or all vendors)
app.get("/api/admin/vendors", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const status = req.query.status;
    let sql = "SELECT * FROM users WHERE role = 'vendor'";
    const params = [];
    if (status) {
      sql += " AND verificationStatus = ?";
      params.push(status);
    }
    sql += " ORDER BY createdAt DESC";
    const vendors = await query.all(sql, params);
    res.json(vendors.map(sanitizeUser));
  } catch (err) {
    console.error("Fetch admin vendors error:", err);
    res.status(500).json({ error: "Failed to fetch vendor registrations." });
  }
});

// PUT /api/admin/vendors/:id/approval (Alias for vendor verification)
app.put("/api/admin/vendors/:id/approval", authenticateToken, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body; // 'Verified' | 'Rejected' | 'Approved'

  const normalizedStatus = (status || "").toLowerCase().startsWith("app") || (status || "").toLowerCase().startsWith("ver") ? "Verified" : "Rejected";

  try {
    await query.run("UPDATE users SET verificationStatus = ? WHERE id = ?", [normalizedStatus, id]);
    
    const notifId = generateId("n");
    await query.run(
      "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'verification', 0, ?)",
      [notifId, id, `Your vendor account verification status has been updated to ${normalizedStatus}. ${reason ? "Reason: " + reason : ""}`, new Date().toISOString()]
    );

    res.json({ message: `Vendor account updated to ${normalizedStatus} successfully.` });
  } catch (err) {
    console.error("Verify vendor error:", err);
    res.status(500).json({ error: "Failed to update vendor verification." });
  }
});

// GET /api/admin/products/pending (Admin fetch pending products)
app.get("/api/admin/products/pending", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const products = await query.all("SELECT * FROM products WHERE status = 'pending' ORDER BY createdAt DESC");
    res.json(products);
  } catch (err) {
    console.error("Fetch pending products error:", err);
    res.status(500).json({ error: "Failed to fetch pending products." });
  }
});

// PUT /api/users/:id/verification (Admin approve/reject vendor verification)
app.put("/api/users/:id/verification", authenticateToken, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Verified' | 'Rejected'

  if (!status) {
    return res.status(400).json({ error: "Status is required." });
  }

  try {
    await query.run("UPDATE users SET verificationStatus = ? WHERE id = ?", [status, id]);
    
    // Create verification notification
    const notifId = generateId("n");
    await query.run(
      "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'verification', 0, ?)",
      [notifId, id, `Your account verification status has been updated to ${status}.`, new Date().toISOString()]
    );

    res.json({ message: "Verification status updated successfully." });
  } catch (err) {
    console.error("Verify user error:", err);
    res.status(500).json({ error: "Failed to update user verification." });
  }
});

// ---------------- PRODUCT ROUTES ----------------

// GET /api/products
app.get("/api/products", async (req, res) => {
  try {
    const products = await query.all("SELECT * FROM products ORDER BY createdAt DESC");
    res.json(products);
  } catch (err) {
    console.error("Fetch products database error:", err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

// Product creation handler function
async function handleCreateProduct(req, res) {
  const {
    name,
    category,
    grade,
    price,
    currency,
    unit,
    stock,
    vendorId,
    countryCode,
    region,
    district,
    city,
    lat,
    lng,
    description,
    imageUrl,
    images,
    moq,
    tierPrices,
    organic,
    harvestDate,
    materialType,
    packagingType,
    recyclability,
    isRenewableEnergy,
    lifespanYears
  } = req.body;

  const resolvedVendorId = (req.user && req.user.role === "vendor") ? req.user.id : vendorId;
  if (!resolvedVendorId) {
    return res.status(401).json({ error: "Please log in as a vendor to add products." });
  }
  const resolvedUnit = unit || "piece";

  if (!name || !category || price === undefined || price === null || stock === undefined || stock === null) {
    return res.status(400).json({ error: "Required fields: name, category, price, stock" });
  }

  const id = generateId("p");
  const createdAt = new Date().toISOString();
  const eco = computeEcoMetrics({ materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears });

  const imagesStr = typeof images === "object" ? JSON.stringify(images) : (images || "[]");
  const primaryImage = imageUrl || (Array.isArray(images) && images.length > 0 ? images[0] : "");

  try {
    const vendor = await query.get("SELECT countryCode, region, district, city, lat, lng, currency FROM users WHERE id = ?", [resolvedVendorId]);

    await query.run(
      `INSERT INTO products (id, name, category, grade, price, currency, unit, stock, vendorId, countryCode, region, district, city, lat, lng, description, imageUrl, images, moq, tierPrices, organic, harvestDate, createdAt, status, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears, ecoScore, co2SavedKg, plasticSavedKg, waterSavedLiters, treesEquivalent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        category,
        grade || "A",
        Number(price),
        currency || (vendor ? vendor.currency : "INR"),
        resolvedUnit,
        Number(stock),
        resolvedVendorId,
        countryCode || (vendor ? vendor.countryCode : "IN"),
        region || (vendor ? vendor.region : "Tamil Nadu"),
        district || (vendor ? vendor.district : "Thoothukudi"),
        city || (vendor ? vendor.city : "Kovilpatti"),
        lat !== undefined && lat !== null ? parseFloat(lat) : (vendor && vendor.lat ? vendor.lat : 9.1724),
        lng !== undefined && lng !== null ? parseFloat(lng) : (vendor && vendor.lng ? vendor.lng : 77.8687),
        description || "",
        primaryImage,
        imagesStr,
        moq ? Number(moq) : 1,
        tierPrices || "{}",
        organic ? 1 : 0,
        harvestDate || null,
        createdAt,
        "pending",
        materialType || "standard",
        packagingType || "minimal_plastic",
        recyclability !== undefined ? Number(recyclability) : 80,
        isRenewableEnergy ? 1 : 0,
        lifespanYears !== undefined ? Number(lifespanYears) : 2,
        eco.ecoScore,
        eco.co2SavedKg,
        eco.plasticSavedKg,
        eco.waterSavedLiters,
        eco.treesEquivalent
      ]
    );

    // Notify all admins that a new product awaits approval
    const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await query.run(
        "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, ?, 0, ?)",
        [generateId("n"), admin.id, `New product "${name}" was submitted and is awaiting your approval.`, "product", createdAt]
      );
    }

    const newProduct = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    console.log(`✅ Product created successfully: ${id} (${name}) for vendor ${resolvedVendorId}`);
    res.status(201).json(newProduct || { id, name, category, price, stock, vendorId: resolvedVendorId, status: "pending", ecoScore: eco.ecoScore });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Failed to create product." });
  }
}

// POST /api/products
app.post("/api/products", authenticateToken, requireRole("vendor", "admin"), handleCreateProduct);

// POST /api/vendor/products (Alias)
app.post("/api/vendor/products", authenticateToken, requireRole("vendor", "admin"), handleCreateProduct);

// GET /api/vendor/products (Vendor gets all their products regardless of status)
app.get("/api/vendor/products", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const vendorId = req.query.vendorId || (req.user ? req.user.id : null);
    if (!vendorId) {
      const allProds = await query.all("SELECT * FROM products ORDER BY createdAt DESC");
      return res.json(allProds);
    }
    const products = await query.all("SELECT * FROM products WHERE vendorId = ? ORDER BY createdAt DESC", [vendorId]);
    res.json(products);
  } catch (err) {
    console.error("Fetch vendor products error:", err);
    res.status(500).json({ error: "Failed to fetch vendor products." });
  }
});

// PUT /api/products/:id
app.put("/api/products/:id", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {
  const { id } = req.params;
  const { name, category, grade, price, currency, unit, stock, countryCode, region, district, city, lat, lng, description, imageUrl, images, moq, tierPrices, organic, harvestDate, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears } = req.body;

  try {
    const product = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const ecoInputsChanged = [materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears].some((v) => v !== undefined);
    const eco = ecoInputsChanged
      ? computeEcoMetrics({
          materialType: materialType !== undefined ? materialType : product.materialType,
          packagingType: packagingType !== undefined ? packagingType : product.packagingType,
          recyclability: recyclability !== undefined ? recyclability : product.recyclability,
          isRenewableEnergy: isRenewableEnergy !== undefined ? isRenewableEnergy : !!product.isRenewableEnergy,
          lifespanYears: lifespanYears !== undefined ? lifespanYears : product.lifespanYears
        })
      : null;

    // Material/pricing edits require the marketplace listing to go back through admin review
    const nextStatus = ecoInputsChanged || name !== undefined || category !== undefined ? "pending" : product.status;

    const imagesStr = images !== undefined ? (typeof images === "object" ? JSON.stringify(images) : images) : product.images;

    await query.run(
      `UPDATE products 
       SET name = ?, category = ?, grade = ?, price = ?, currency = ?, unit = ?, stock = ?, countryCode = ?, region = ?, district = ?, city = ?, lat = ?, lng = ?, description = ?, imageUrl = ?, images = ?, moq = ?, tierPrices = ?, organic = ?, harvestDate = ?,
           materialType = ?, packagingType = ?, recyclability = ?, isRenewableEnergy = ?, lifespanYears = ?, ecoScore = ?, co2SavedKg = ?, plasticSavedKg = ?, waterSavedLiters = ?, treesEquivalent = ?,
           status = ?, rejectionReason = ''
       WHERE id = ?`,
      [
        name !== undefined ? name : product.name,
        category !== undefined ? category : product.category,
        grade !== undefined ? grade : product.grade,
        price !== undefined ? price : product.price,
        currency !== undefined ? currency : product.currency,
        unit !== undefined ? unit : product.unit,
        stock !== undefined ? stock : product.stock,
        countryCode !== undefined ? countryCode : product.countryCode,
        region !== undefined ? region : product.region,
        district !== undefined ? district : product.district,
        city !== undefined ? city : product.city,
        lat !== undefined && lat !== null ? parseFloat(lat) : product.lat,
        lng !== undefined && lng !== null ? parseFloat(lng) : product.lng,
        description !== undefined ? description : product.description,
        imageUrl !== undefined ? imageUrl : product.imageUrl,
        imagesStr,
        moq !== undefined ? moq : product.moq,
        tierPrices !== undefined ? tierPrices : product.tierPrices,
        organic !== undefined ? organic : product.organic,
        harvestDate !== undefined ? harvestDate : product.harvestDate,
        materialType !== undefined ? materialType : product.materialType,
        packagingType !== undefined ? packagingType : product.packagingType,
        recyclability !== undefined ? recyclability : product.recyclability,
        isRenewableEnergy !== undefined ? (isRenewableEnergy ? 1 : 0) : product.isRenewableEnergy,
        lifespanYears !== undefined ? lifespanYears : product.lifespanYears,
        eco ? eco.ecoScore : product.ecoScore,
        eco ? eco.co2SavedKg : product.co2SavedKg,
        eco ? eco.plasticSavedKg : product.plasticSavedKg,
        eco ? eco.waterSavedLiters : product.waterSavedLiters,
        eco ? eco.treesEquivalent : product.treesEquivalent,
        nextStatus,
        id
      ]
    );

    const updatedProduct = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    res.json(updatedProduct);
  } catch (err) {
    console.error("Update product database error:", err);
    res.status(500).json({ error: "Failed to update product." });
  }
});

// PUT /api/products/:id/approval  (Admin: approve or reject a pending product)
app.put("/api/products/:id/approval", authenticateToken, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
  }

  try {
    const product = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    await query.run("UPDATE products SET status = ?, rejectionReason = ? WHERE id = ?", [status, status === "rejected" ? (rejectionReason || "") : "", id]);

    await query.run(
      "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, ?, 0, ?)",
      [
        generateId("n"),
        product.vendorId,
        status === "approved"
          ? `Your product "${product.name}" is now live on the EcoMart marketplace.`
          : `Your product "${product.name}" was rejected. Reason: ${rejectionReason || "Not specified"}`,
        "product",
        new Date().toISOString()
      ]
    );

    const updatedProduct = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    res.json({ message: `Product ${status} successfully.`, product: updatedProduct });
  } catch (err) {
    console.error("Product approval database error:", err);
    res.status(500).json({ error: "Failed to update product approval status." });
  }
});

// DELETE /api/products/:id
app.delete("/api/products/:id", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const product = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    await query.run("DELETE FROM products WHERE id = ?", [id]);
    res.json({ message: "Product deleted successfully.", id });
  } catch (err) {
    console.error("Delete product database error:", err);
    res.status(500).json({ error: "Failed to delete product." });
  }
});

// ---------------- PAYMENT & PAYOUT ROUTES ----------------

// POST /api/payments/create-razorpay-order
app.post("/api/payments/create-razorpay-order", authenticateToken, async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "EcoMart Order ID is required." });
  }

  // Ensure Razorpay environment variables are configured
  if (!isRazorpayConfigured()) {
    return res.status(400).json({
      error: "Razorpay credentials are not properly configured in backend environment. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file."
    });
  }

  try {
    const order = await query.get("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order) {
      return res.status(404).json({ error: `Order '${orderId}' not found.` });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order is already paid." });
    }

    // Convert totalAmount (INR) to paise (integer)
    const amountInPaise = Math.round(Number(order.totalAmount || 0) * 100);
    if (amountInPaise <= 0) {
      return res.status(400).json({ error: "Order total amount must be greater than zero." });
    }

    // Create real Razorpay Order via official SDK
    const rzpOrder = await createRazorpayOrder({
      amount: amountInPaise,
      currency: order.currency || "INR",
      receipt: String(order.id),
      notes: {
        ecoMartOrderId: String(order.id),
        customerName: order.customerName || "Customer"
      }
    });

    const rzpOrderId = rzpOrder ? rzpOrder.id : null;

    // Update order with returned razorpayOrderId and paymentStatus
    if (rzpOrderId) {
      await query.run(
        `UPDATE orders SET razorpayOrderId = ?, paymentStatus = 'payment_created' WHERE id = ?`,
        [rzpOrderId, order.id]
      );
    }

    const keyId = getRazorpayKeyId();

    res.json({
      keyId,
      razorpayOrderId: rzpOrderId,
      amount: amountInPaise,
      currency: order.currency || "INR",
      ecoMartOrderId: order.id
    });
  } catch (err) {
    console.error("Create Razorpay order error:", err);
    res.status(500).json({ error: err.message || "Failed to create Razorpay order." });
  }
});

// POST /api/payments/verify-razorpay-payment
app.post("/api/payments/verify-razorpay-payment", authenticateToken, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderId
  } = req.body;

  const rzpOrderId = razorpay_order_id || razorpayOrderId;
  const rzpPaymentId = razorpay_payment_id || razorpayPaymentId;
  const rzpSignature = razorpay_signature || razorpaySignature;

  if (!rzpOrderId || !rzpPaymentId || !rzpSignature) {
    return res.status(400).json({ error: "Missing required Razorpay payment response parameters." });
  }

  try {
    // Retrieve target order by orderId or razorpayOrderId
    const targetId = orderId || rzpOrderId;
    const order = await query.get("SELECT * FROM orders WHERE id = ? OR razorpayOrderId = ?", [targetId, rzpOrderId]);

    if (!order) {
      return res.status(404).json({ error: "Associated EcoMart order not found." });
    }

    // Idempotency check: if order is already paid, return clean success without repeating side effects
    if (order.paymentStatus === "paid") {
      return res.json({
        success: true,
        message: "Payment already verified.",
        orderId: order.id,
        paymentId: order.razorpayPaymentId || rzpPaymentId
      });
    }

    // Cryptographically verify payment signature using HMAC SHA-256
    const isValid = verifyPaymentSignature({
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: rzpSignature
    });

    if (!isValid) {
      console.warn(`❌ Invalid Razorpay signature for order ${order.id}`);

      // Update payment status to failed and record reason
      await query.run(
        `UPDATE orders SET paymentStatus = 'failed', paymentFailureReason = 'Invalid HMAC signature' WHERE id = ?`,
        [order.id]
      );

      // Release reserved stock back to inventory
      const items = await query.all("SELECT productId, qty FROM order_items WHERE orderId = ?", [order.id]);
      for (const item of items) {
        if (item.productId && item.qty) {
          await query.run("UPDATE products SET stock = stock + ? WHERE id = ?", [item.qty, item.productId]);
        }
      }

      return res.status(400).json({
        success: false,
        error: "Razorpay payment signature verification failed. Payment cannot be accepted."
      });
    }

    const verifiedAt = new Date().toISOString();

    // Mark order as paid & confirmed
    await query.run(
      `UPDATE orders SET
        paymentStatus = 'paid',
        status = 'Confirmed',
        paymentVerifiedAt = ?,
        razorpayOrderId = ?,
        razorpayPaymentId = ?,
        razorpaySignature = ?,
        vendorPayoutStatus = 'pending'
      WHERE id = ?`,
      [verifiedAt, rzpOrderId, rzpPaymentId, rzpSignature, order.id]
    );

    // Notify Customer
    if (order.customerId) {
      await query.run(
        "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
        [
          generateId("n"),
          order.customerId,
          `Payment of ₹${order.totalAmount || 0} for Order ${order.id} was verified successfully! Razorpay Payment ID: ${rzpPaymentId}`,
          verifiedAt
        ]
      );
    }

    // Notify Vendors & increment completed orders count
    const vendorItems = await query.all("SELECT DISTINCT vendorId FROM order_items WHERE orderId = ?", [order.id]);
    for (const vItem of vendorItems) {
      if (vItem.vendorId) {
        await query.run(
          "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
          [
            generateId("n"),
            vItem.vendorId,
            `Order ${order.id} payment of ₹${order.totalAmount || 0} has been confirmed. Payout is pending processing.`,
            verifiedAt
          ]
        );
      }
    }

    res.json({
      success: true,
      message: "Razorpay payment verified successfully!",
      orderId: order.id,
      paymentId: rzpPaymentId,
      verifiedAt
    });
  } catch (err) {
    console.error("Verify Razorpay payment error:", err);
    res.status(500).json({ error: "Failed to verify payment." });
  }
});

// POST /api/payments/cancel-razorpay-payment
app.post("/api/payments/cancel-razorpay-payment", authenticateToken, async (req, res) => {
  const { orderId, reason } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const order = await query.get("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.paymentStatus !== "paid") {
      await query.run(
        "UPDATE orders SET paymentStatus = 'cancelled', paymentFailureReason = ? WHERE id = ?",
        [reason || "Payment cancelled by customer", orderId]
      );

      // Release reserved stock back to inventory
      const items = await query.all("SELECT productId, qty FROM order_items WHERE orderId = ?", [orderId]);
      for (const item of items) {
        if (item.productId && item.qty) {
          await query.run("UPDATE products SET stock = stock + ? WHERE id = ?", [item.qty, item.productId]);
        }
      }
    }

    res.json({ message: "Payment cancelled and reserved stock released.", orderId });
  } catch (err) {
    console.error("Cancel payment error:", err);
    res.status(500).json({ error: "Failed to cancel payment." });
  }
});

// POST /api/payments/razorpay-webhook
app.post("/api/payments/razorpay-webhook", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing x-razorpay-signature header." });
  }

  const rawBody = req.body;
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("⚠️ Webhook signature verification failed!");
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  try {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    const eventData = JSON.parse(bodyStr);
    const event = eventData.event;
    const payload = eventData.payload;

    console.log(`Received verified Razorpay Webhook event: ${event}`);

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id || payload?.order?.entity?.id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId) {
        const order = await query.get("SELECT * FROM orders WHERE razorpayOrderId = ?", [rzpOrderId]);
        if (order && order.paymentStatus !== "paid") {
          const verifiedAt = new Date().toISOString();
          await query.run(
            `UPDATE orders SET
              paymentStatus = 'paid',
              status = 'Confirmed',
              paymentVerifiedAt = ?,
              razorpayPaymentId = ?,
              vendorPayoutStatus = 'pending'
            WHERE id = ?`,
            [verifiedAt, rzpPaymentId || "", order.id]
          );

          if (order.customerId) {
            await query.run(
              "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
              [generateId("n"), order.customerId, `Payment of ₹${order.totalAmount} for Order ${order.id} confirmed via Razorpay Webhook.`, verifiedAt]
            );
          }
        }
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;

      if (rzpOrderId) {
        const order = await query.get("SELECT * FROM orders WHERE razorpayOrderId = ?", [rzpOrderId]);
        if (order && order.paymentStatus === "pending") {
          await query.run(
            "UPDATE orders SET paymentStatus = 'failed', paymentFailureReason = ? WHERE id = ?",
            [paymentEntity?.error_description || "Payment failed at gateway", order.id]
          );

          // Release reserved stock
          const items = await query.all("SELECT productId, qty FROM order_items WHERE orderId = ?", [order.id]);
          for (const item of items) {
            if (item.productId && item.qty) {
              await query.run("UPDATE products SET stock = stock + ? WHERE id = ?", [item.qty, item.productId]);
            }
          }
        }
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Razorpay webhook processing error:", err);
    res.status(500).json({ error: "Webhook processing error." });
  }
});

// GET /api/orders/:id/payment
app.get("/api/orders/:id/payment", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await query.get(
      "SELECT id, totalAmount, currency, status, paymentStatus, razorpayOrderId, razorpayPaymentId, paymentVerifiedAt, vendorPayoutStatus, paymentFailureReason FROM orders WHERE id = ?",
      [id]
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    res.json(order);
  } catch (err) {
    console.error("Fetch order payment details error:", err);
    res.status(500).json({ error: "Failed to fetch order payment status." });
  }
});


// GET /api/products/compare/:id
app.get("/api/products/compare/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const targetProduct = await query.get(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!targetProduct) {
      return res.status(404).json({ error: "Comparison product not found." });
    }
    res.json(targetProduct);
  } catch (err) {
    console.error("Fetch compare product error:", err);
    res.status(500).json({ error: "Failed to fetch comparison details." });
  }
});

// GET /api/orders
// Returns joined order items to keep backward compatibility with frontend pages
app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const joinedOrders = await query.all(`
      SELECT 
        o.id as id,
        o.customerId,
        o.customerName,
        o.deliveryCountry,
        o.deliveryRegion,
        o.deliveryDistrict,
        o.deliveryCity,
        o.deliveryPostalCode,
        o.deliveryAddress,
        o.paymentMethod,
        o.totalAmount,
        o.currency,
        o.status,
        o.createdAt,
        oi.productId,
        oi.vendorId,
        oi.qty,
        oi.amount,
        oi.unitPrice,
        oi.id as itemId
      FROM orders o
      JOIN order_items oi ON o.id = oi.orderId
      ORDER BY o.createdAt DESC
    `);
    res.json(joinedOrders);
  } catch (err) {
    console.error("Fetch orders database error:", err);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// POST /api/orders (Unified Multi-Item B2B Checkout)
app.post("/api/orders", authenticateToken, async (req, res) => {
  const {
    customerId,
    customerName,
    deliveryCountry,
    deliveryRegion,
    deliveryDistrict,
    deliveryCity,
    deliveryPostalCode,
    deliveryAddress,
    paymentMethod,
    totalAmount,
    deliveryFee = 0,
    currency,
    items
  } = req.body;

  const finalCustomerId = req.user?.id || customerId;
  const finalCustomerName = customerName || req.user?.name || "Customer";

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Required: non-empty items array." });
  }

  try {
    // 1. Server-side authoritative validation of product stock and unit prices
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await query.get("SELECT * FROM products WHERE id = ?", [item.productId]);
      if (!product) {
        return res.status(400).json({ error: `Product '${item.productId}' was not found.` });
      }

      if ((product.stock || 0) < item.qty) {
        return res.status(400).json({
          error: `Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${item.qty}`
        });
      }

      const authoritativeUnitPrice = Number(product.price) || Number(item.unitPrice) || 0;
      const itemAmount = authoritativeUnitPrice * item.qty;
      calculatedSubtotal += itemAmount;

      validatedItems.push({
        productId: product.id,
        vendorId: product.vendorId || item.vendorId || null,
        productName: product.name,
        qty: item.qty,
        unitPrice: authoritativeUnitPrice,
        amount: itemAmount
      });
    }

    // Authoritative total calculation (subtotal + delivery fee)
    const authoritativeTotal = parseFloat((calculatedSubtotal + (Number(deliveryFee) || 0)).toFixed(2));
    const finalTotal = totalAmount && Math.abs(Number(totalAmount) - authoritativeTotal) < 5 ? Number(totalAmount) : authoritativeTotal;

    const orderId = `EM-${Math.floor(Math.random() * 9000 + 1000)}`;
    const createdAt = new Date().toISOString();
    const greenPointsEarned = Math.max(10, Math.round(finalTotal / 100));
    const initialPaymentStatus = paymentMethod === "cod" ? "pending" : "pending";
    const initialOrderStatus = "Pending";

    // 2. Insert Order record with paymentStatus = 'pending'
    await query.run(
      `INSERT INTO orders (
        id, customerId, customerName, deliveryCountry, deliveryRegion, deliveryDistrict, deliveryCity, deliveryPostalCode, deliveryAddress, paymentMethod, totalAmount, currency, status, paymentStatus, vendorPayoutStatus, greenPointsEarned, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?, ?)`,
      [
        orderId,
        finalCustomerId || null,
        finalCustomerName,
        deliveryCountry || "India",
        deliveryRegion || null,
        deliveryDistrict || null,
        deliveryCity || null,
        deliveryPostalCode || null,
        deliveryAddress || null,
        paymentMethod || "Razorpay",
        finalTotal,
        currency || "INR",
        initialOrderStatus,
        initialPaymentStatus,
        greenPointsEarned,
        createdAt
      ]
    );

    // Credit Green Reward Points if customer ID is present
    if (customerId) {
      await query.run("UPDATE users SET greenPoints = COALESCE(greenPoints, 0) + ? WHERE id = ?", [greenPointsEarned, customerId]);
      await query.run(
        "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
        [generateId("n"), customerId, `Order ${orderId} created! You earned +${greenPointsEarned} Green Points.`, createdAt]
      );
    }

    // 3. Insert Order Items and reserve stock
    for (let i = 0; i < validatedItems.length; i++) {
      const vItem = validatedItems[i];
      const itemId = `${orderId}-${i + 1}`;

      await query.run(
        `INSERT INTO order_items (id, orderId, productId, vendorId, qty, unitPrice, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, vItem.productId, vItem.vendorId, vItem.qty, vItem.unitPrice, vItem.amount]
      );

      // Reserve stock (decrement)
      await query.run(
        "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
        [vItem.qty, vItem.productId]
      );

      // Notify vendor
      if (vItem.vendorId) {
        await query.run(
          "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
          [generateId("n"), vItem.vendorId, `New order ${orderId} received for ${vItem.qty}x ${vItem.productName} from ${customerName}`, createdAt]
        );
      }
    }

    // Return created joined order records
    const createdJoined = await query.all(`
      SELECT o.*, oi.productId, oi.vendorId, oi.qty, oi.amount, oi.unitPrice, oi.id as itemId
      FROM orders o JOIN order_items oi ON o.id = oi.orderId
      WHERE o.id = ?
    `, [orderId]);

    res.status(201).json(createdJoined);
  } catch (err) {
    console.error("Create order database error:", err);
    res.status(500).json({ error: "Failed to create order." });
  }
});

// PUT /api/orders/:id (Update order status and notify user)
app.put("/api/orders/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Pending', 'Accepted', 'Preparing', 'Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'

  if (!status) {
    return res.status(400).json({ error: "Status is required." });
  }

  try {
    const order = await query.get("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    await query.run("UPDATE orders SET status = ? WHERE id = ?", [status, id]);

    // Create a notification for the customer of order updates
    if (order.customerId) {
      const notifId = generateId("n");
      const notifText = `Order ${id} is now ${status}`;
      await query.run(
        "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
        [notifId, order.customerId, notifText, new Date().toISOString()]
      );
    }

    // If marked Delivered, increment vendor completed orders counter
    if (status === "Delivered") {
      const items = await query.all("SELECT DISTINCT vendorId FROM order_items WHERE orderId = ?", [id]);
      for (const item of items) {
        if (item.vendorId) {
          await query.run("UPDATE users SET completedOrders = completedOrders + 1 WHERE id = ?", [item.vendorId]);
        }
      }
    }

    // Return joined rows reflecting the update
    const updatedJoined = await query.get(`
      SELECT o.*, oi.productId, oi.vendorId, oi.qty, oi.amount, oi.unitPrice, oi.id as itemId
      FROM orders o JOIN order_items oi ON o.id = oi.orderId
      WHERE o.id = ? LIMIT 1
    `, [id]);

    res.json(updatedJoined);
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ error: "Failed to update order status." });
  }
});

// ---------------- NOTIFICATION ROUTES ----------------

// GET /api/notifications (Linked strictly to userId)
app.get("/api/notifications", authenticateToken, async (req, res) => {
  const { userId } = req.query;

  try {
    let notifications;
    if (userId) {
      notifications = await query.all(
        "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC",
        [userId]
      );
    } else {
      notifications = await query.all("SELECT * FROM notifications ORDER BY createdAt DESC");
    }
    
    const mapped = notifications.map(n => ({
      ...n,
      read: !!n.read
    }));
    res.json(mapped);
  } catch (err) {
    console.error("Fetch notifications database error:", err);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

// POST /api/notifications
app.post("/api/notifications", authenticateToken, async (req, res) => {
  const { userId, text, type } = req.body;

  if (!userId || !text) {
    return res.status(400).json({ error: "userId and notification text are required." });
  }

  const id = generateId("n");
  const createdAt = new Date().toISOString();

  try {
    await query.run(
      "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, ?, 0, ?)",
      [id, userId, text, type || "system", createdAt]
    );

    const newNotif = await query.get("SELECT * FROM notifications WHERE id = ?", [id]);
    if (newNotif) newNotif.read = !!newNotif.read;
    res.status(201).json(newNotif);
  } catch (err) {
    console.error("Create notification database error:", err);
    res.status(500).json({ error: "Failed to create notification." });
  }
});

// PUT /api/notifications/read-all
app.put("/api/notifications/read-all", authenticateToken, async (req, res) => {
  const { userId } = req.body;

  try {
    if (userId) {
      await query.run("UPDATE notifications SET `read` = 1 WHERE userId = ?", [userId]);
    } else {
      await query.run("UPDATE notifications SET `read` = 1");
    }
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("Read all notifications error:", err);
    res.status(500).json({ error: "Failed to mark notifications read." });
  }
});

// PUT /api/notifications/:id/read
app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query.run("UPDATE notifications SET `read` = 1 WHERE id = ?", [id]);
    res.json({ message: "Notification marked as read.", id });
  } catch (err) {
    console.error("Read single notification error:", err);
    res.status(500).json({ error: "Failed to mark notification read." });
  }
});

// ---------------- REVIEWS ROUTES ----------------

// GET /api/reviews
app.get("/api/reviews", async (req, res) => {
  const { productId, vendorId } = req.query;

  try {
    let reviews;
    if (productId) {
      reviews = await query.all(
        "SELECT * FROM reviews WHERE productId = ? AND status = 'Approved' ORDER BY createdAt DESC",
        [productId]
      );
    } else if (vendorId) {
      reviews = await query.all(
        "SELECT * FROM reviews WHERE vendorId = ? AND productId IS NULL AND status = 'Approved' ORDER BY createdAt DESC",
        [vendorId]
      );
    } else {
      reviews = await query.all("SELECT * FROM reviews ORDER BY createdAt DESC");
    }
    res.json(reviews);
  } catch (err) {
    console.error("Fetch reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

// POST /api/reviews
app.post("/api/reviews", authenticateToken, async (req, res) => {
  const { productId, vendorId, customerId, customerName, rating, comment } = req.body;

  if (!vendorId || !customerId || !customerName || !rating || !comment) {
    return res.status(400).json({ error: "Required fields: vendorId, customerId, customerName, rating, comment" });
  }

  const id = generateId("r");
  const createdAt = new Date().toISOString();

  try {
    // Determine if purchase is verified (customer bought this vendor's products before)
    let verifiedPurchase = 0;
    const pastOrder = await query.get(
      `SELECT oi.id FROM order_items oi 
       JOIN orders o ON oi.orderId = o.id 
       WHERE o.customerId = ? AND oi.vendorId = ? AND o.status = 'Delivered' LIMIT 1`,
      [customerId, vendorId]
    );
    if (pastOrder) verifiedPurchase = 1;

    await query.run(
      `INSERT INTO reviews (id, productId, vendorId, customerId, customerName, rating, comment, verifiedPurchase, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)`,
      [id, productId || null, vendorId, customerId, customerName, rating, comment, verifiedPurchase, createdAt]
    );

    // Calculate and update new average rating for the vendor
    const average = await query.get("SELECT AVG(rating) as avgRating FROM reviews WHERE vendorId = ? AND status = 'Approved'", [vendorId]);
    if (average && average.avgRating) {
      await query.run("UPDATE users SET rating = ? WHERE id = ?", [parseFloat(average.avgRating.toFixed(1)), vendorId]);
    }

    const newReview = await query.get("SELECT * FROM reviews WHERE id = ?", [id]);
    res.status(201).json(newReview);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to submit review." });
  }
});

// DELETE /api/reviews/:id (For moderation)
app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query.run("DELETE FROM reviews WHERE id = ?", [id]);
    res.json({ message: "Review moderated and removed successfully." });
  } catch (err) {
    console.error("Moderation review error:", err);
    res.status(500).json({ error: "Failed to delete review." });
  }
});

// ---------------- ANALYTICS & INTELLIGENCE ROUTES ----------------

// GET /api/reports/vendor/:vendorId
app.get("/api/reports/vendor/:vendorId", authenticateToken, requireRole("vendor", "admin"), async (req, res) => {
  if (req.user.id !== req.params.vendorId && req.user.role !== "admin") return res.status(403).json({ error: "Access denied." });
  const { vendorId } = req.params;

  try {
    // Real SQL-based calculations using order items database
    const stats = await query.get(
      `SELECT 
        SUM(amount) as totalRevenue,
        COUNT(DISTINCT orderId) as totalOrders,
        SUM(qty) as totalQty
       FROM order_items 
       WHERE vendorId = ?`,
      [vendorId]
    );

    const productPerformance = await query.all(
      `SELECT p.name, SUM(oi.qty) as unitsSold, SUM(oi.amount) as revenue
       FROM order_items oi
       JOIN products p ON oi.productId = p.id
       WHERE oi.vendorId = ?
       GROUP BY oi.productId
       ORDER BY revenue DESC`,
      [vendorId]
    );

    res.json({
      revenue: stats.totalRevenue || 0,
      orders: stats.totalOrders || 0,
      quantitySold: stats.totalQty || 0,
      productPerformance
    });
  } catch (err) {
    console.error("Fetch vendor report error:", err);
    res.status(500).json({ error: "Failed to load reports data." });
  }
});

// ---------------- TRANSLATION ROUTE (Google Cloud Translation API v3) ----------------

const translationCache = new Map();

// Known common translations dictionary for fallback/offline server mode
const SERVER_FALLBACK_DICT = {
  ta: {
    "Dashboard": "டாஷ்போர்டு",
    "Settings": "அமைப்புகள்",
    "Add Product": "தயாரிப்பைச் சேர்",
    "Edit Product": "தயாரிப்பைத் திருத்து",
    "Delete Product": "தயாரிப்பை நீக்கு",
    "Save": "சேமி",
    "Cancel": "ரத்து செய்",
    "Logout": "வெளியேறு",
    "Vendors": "விவசாயிகள்",
    "Buyers": "வாங்குபவர்கள்",
    "Products": "தயாரிப்புகள்",
    "Orders": "ஆர்டர்கள்",
    "Search": "தேடு",
    "Loading...": "ஏற்றுகிறது...",
    "Price": "விலை",
    "Quantity": "அளவு"
  },
  hi: {
    "Dashboard": "डैशबोर्ड",
    "Settings": "सेटिंग्स",
    "Add Product": "उत्पाद जोड़ें",
    "Edit Product": "उत्पाद संपादित करें",
    "Delete Product": "उत्पाद हटाएँ",
    "Save": "सहेजें",
    "Cancel": "रद्द करें",
    "Logout": "लॉग आउट",
    "Vendors": "किसान",
    "Buyers": "खरीदार",
    "Products": "उत्पाद",
    "Orders": "ऑर्डर",
    "Search": "खोजें",
    "Loading...": "लोड हो रहा है...",
    "Price": "मूल्य",
    "Quantity": "मात्रा"
  }
};

app.post("/api/translate", async (req, res) => {
  const { texts, sourceLanguage = "en", targetLanguage = "ta" } = req.body;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "Required: texts must be a non-empty array of strings." });
  }

  if (sourceLanguage === targetLanguage) {
    return res.json({ translations: texts });
  }

  const results = new Array(texts.length);
  const unCachedIndices = [];
  const unCachedTexts = [];

  // 1. Check server in-memory cache first
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`;
    if (translationCache.has(cacheKey)) {
      results[i] = translationCache.get(cacheKey);
    } else {
      unCachedIndices.push(i);
      unCachedTexts.push(text);
    }
  }

  if (unCachedTexts.length === 0) {
    return res.json({ translations: results });
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || process.env.PROJECT_ID;
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  let gcpTranslatedTexts = null;

  // 2. Call Google Cloud Translation API v3 if projectId is available
  if (projectId) {
    try {
      const url = `https://translation.googleapis.com/v3/projects/${projectId}/locations/global:translateText${apiKey ? `?key=${apiKey}` : ""}`;
      
      const requestBody = {
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
        contents: unCachedTexts,
        mimeType: "text/plain"
      };

      const headers = { "Content-Type": "application/json" };
      if (process.env.GOOGLE_ACCESS_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translations && Array.isArray(data.translations)) {
          gcpTranslatedTexts = data.translations.map(t => t.translatedText);
        }
      } else {
        const errText = await response.text();
        console.warn("GCP Translation API v3 notice:", response.status, errText);
      }
    } catch (err) {
      console.warn("GCP Translation API request failed, falling back to local cache/dictionary:", err.message);
    }
  }

  // 3. Process translations (either from GCP or server fallback)
  for (let idx = 0; idx < unCachedTexts.length; idx++) {
    const origText = unCachedTexts[idx];
    const targetIdx = unCachedIndices[idx];
    let translated;

    if (gcpTranslatedTexts && gcpTranslatedTexts[idx]) {
      translated = gcpTranslatedTexts[idx];
    } else if (SERVER_FALLBACK_DICT[targetLanguage] && SERVER_FALLBACK_DICT[targetLanguage][origText]) {
      translated = SERVER_FALLBACK_DICT[targetLanguage][origText];
    } else {
      translated = origText; // Fallback to original text if unavailable
    }

    // Cache the result
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${origText}`;
    translationCache.set(cacheKey, translated);
    results[targetIdx] = translated;
  }

  res.json({ translations: results });
});

// ---------------- GREEN REWARDS / COUPONS ----------------

// GET /api/coupons - list active coupons in the rewards catalog
app.get("/api/coupons", async (req, res) => {
  try {
    const coupons = await query.all("SELECT * FROM coupons WHERE isActive = 1 ORDER BY pointsRequired ASC");
    res.json(coupons);
  } catch (err) {
    console.error("Fetch coupons database error:", err);
    res.status(500).json({ error: "Failed to fetch coupons." });
  }
});

// POST /api/coupons - create a coupon (Admin)
app.post("/api/coupons", authenticateToken, requireRole("admin"), async (req, res) => {
  const { code, description, discountPercentage, pointsRequired } = req.body;
  if (!code || discountPercentage === undefined || pointsRequired === undefined) {
    return res.status(400).json({ error: "Required: code, discountPercentage, pointsRequired" });
  }
  try {
    const existing = await query.get("SELECT id FROM coupons WHERE code = ?", [code.toUpperCase()]);
    if (existing) return res.status(400).json({ error: "Coupon code already exists." });

    const id = generateId("c");
    await query.run(
      `INSERT INTO coupons (id, code, description, discountPercentage, pointsRequired, isActive, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, code.toUpperCase(), description || "", discountPercentage, pointsRequired, new Date().toISOString()]
    );
    const coupon = await query.get("SELECT * FROM coupons WHERE id = ?", [id]);
    res.status(201).json(coupon);
  } catch (err) {
    console.error("Create coupon database error:", err);
    res.status(500).json({ error: "Failed to create coupon." });
  }
});

// DELETE /api/coupons/:id - remove a coupon (Admin)
app.delete("/api/coupons/:id", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    await query.run("DELETE FROM coupons WHERE id = ?", [req.params.id]);
    res.json({ message: "Coupon removed successfully.", id: req.params.id });
  } catch (err) {
    console.error("Delete coupon database error:", err);
    res.status(500).json({ error: "Failed to delete coupon." });
  }
});

// POST /api/coupons/:id/redeem - a customer redeems Green Points for a coupon
app.post("/api/coupons/:id/redeem", authenticateToken, async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: "customerId is required." });

  try {
    const coupon = await query.get("SELECT * FROM coupons WHERE id = ? AND isActive = 1", [req.params.id]);
    if (!coupon) return res.status(404).json({ error: "Coupon not found." });

    const customer = await query.get("SELECT * FROM users WHERE id = ?", [customerId]);
    if (!customer) return res.status(404).json({ error: "Customer not found." });

    if ((customer.greenPoints || 0) < coupon.pointsRequired) {
      return res.status(400).json({ error: "Not enough Green Points to redeem this reward." });
    }

    await query.run("UPDATE users SET greenPoints = greenPoints - ? WHERE id = ?", [coupon.pointsRequired, customerId]);
    await query.run(
      "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'reward', 0, ?)",
      [generateId("n"), customerId, `You redeemed ${coupon.pointsRequired} points for coupon ${coupon.code} (${coupon.discountPercentage}% off).`, new Date().toISOString()]
    );

    const updatedCustomer = await query.get("SELECT * FROM users WHERE id = ?", [customerId]);
    res.json({ message: "Coupon redeemed successfully!", coupon, user: sanitizeUser(updatedCustomer) });
  } catch (err) {
    console.error("Redeem coupon database error:", err);
    res.status(500).json({ error: "Failed to redeem coupon." });
  }
});

// ---------------- REVIEWS API ROUTES ----------------

// GET /api/reviews - Get reviews (all, or filtered by productId or vendorId)
app.get("/api/reviews", async (req, res) => {
  const { productId, vendorId } = req.query;
  try {
    let sql = "SELECT * FROM reviews";
    let params = [];
    if (productId) {
      sql += " WHERE productId = ?";
      params.push(productId);
    } else if (vendorId) {
      sql += " WHERE vendorId = ?";
      params.push(vendorId);
    }
    sql += " ORDER BY createdAt DESC";
    const reviews = await query.all(sql, params);
    res.json(reviews);
  } catch (err) {
    console.error("Fetch reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

// POST /api/reviews - Submit a product review (written comment required, image optional)
app.post("/api/reviews", async (req, res) => {
  const { productId, vendorId, customerId, customerName, rating, comment, imageUrl } = req.body;

  if (!productId || !comment || !comment.trim()) {
    return res.status(400).json({ error: "Product ID and a written review comment are required." });
  }

  const reviewId = generateId("rev_");
  const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
  const now = new Date().toISOString();

  try {
    let targetVendorId = vendorId;
    if (!targetVendorId) {
      const prod = await query.get("SELECT vendorId FROM products WHERE id = ?", [productId]);
      if (prod) targetVendorId = prod.vendorId;
    }

    const callerName = customerName || "Verified Purchaser";
    const callerId = customerId || "u_customer";

    await query.run(
      `INSERT INTO reviews (id, productId, vendorId, customerId, customerName, rating, comment, imageUrl, verifiedPurchase, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'Approved', ?)`,
      [reviewId, productId, targetVendorId || "v1", callerId, callerName, numRating, comment.trim(), imageUrl ? imageUrl.trim() : null, now]
    );

    const created = {
      id: reviewId,
      productId,
      vendorId: targetVendorId || "v1",
      customerId: callerId,
      customerName: callerName,
      rating: numRating,
      comment: comment.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
      verifiedPurchase: 1,
      status: "Approved",
      createdAt: now
    };

    res.status(201).json(created);
  } catch (err) {
    console.error("Submit review error:", err);
    res.status(500).json({ error: "Failed to submit review." });
  }
});

// DELETE /api/reviews/:id - Delete/Moderate review
app.delete("/api/reviews/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query.run("DELETE FROM reviews WHERE id = ?", [id]);
    res.json({ success: true, message: "Review deleted successfully." });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ error: "Failed to delete review." });
  }
});

// ---------------- GEMINI AI SUITE & ECO DASHBOARD ----------------

// Helper: Call Gemini API REST Endpoint
async function callGeminiApi(promptText, inlineImageBase64 = null, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your_") || apiKey.includes("here")) {
    return null;
  }

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  const fetch = (await import("node-fetch")).default;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const parts = [{ text: promptText }];
      if (inlineImageBase64) {
        let cleanBase64 = inlineImageBase64;
        if (cleanBase64.startsWith("data:")) {
          const split = cleanBase64.split(";base64,");
          mimeType = split[0].replace("data:", "") || mimeType;
          cleanBase64 = split[1] || cleanBase64;
        }
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: cleanBase64
          }
        });
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      // Quietly ignore individual model attempt failures
    }
  }
  return null;
}





// GET /api/customer/eco-dashboard - Customer Sustainability Dashboard Stats
app.get("/api/customer/eco-dashboard", authenticateToken, async (req, res) => {
  const userId = req.query.userId || (req.user ? req.user.id : "u_krishmessi91");

  try {
    const user = await query.get("SELECT greenPoints, greenpoints, name, email FROM users WHERE id = ?", [userId]);
    const orders = await query.all("SELECT * FROM orders WHERE customerId = ?", [userId]);

    const userGreenPoints = user ? (user.greenPoints !== undefined ? user.greenPoints : (user.greenpoints !== undefined ? user.greenpoints : 150)) : 150;
    const totalPurchases = orders.length;
    let co2SavedKg = totalPurchases * 3.5;
    let plasticSavedKg = totalPurchases * 0.45;
    let waterSavedLiters = totalPurchases * 120;
    let treesEquivalent = parseFloat((totalPurchases * 0.15).toFixed(2));

    res.json({
      userId,
      userName: user ? user.name : "Eco Buyer",
      greenPoints: userGreenPoints,
      totalOrders: totalPurchases,
      co2SavedKg: parseFloat(co2SavedKg.toFixed(2)),
      plasticSavedKg: parseFloat(plasticSavedKg.toFixed(2)),
      waterSavedLiters: Math.round(waterSavedLiters),
      treesEquivalent,
      badges: [
        { name: "Plastic Free Pioneer", icon: "🌱", unlocked: totalPurchases >= 1 },
        { name: "Carbon Zero Champion", icon: "⚡", unlocked: totalPurchases >= 3 },
        { name: "Tree Planter Hero", icon: "🌳", unlocked: totalPurchases >= 5 }
      ],
      recentScans: []
    });
  } catch (err) {
    console.error("Fetch Eco Dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch eco dashboard statistics." });
  }
});

// Serve static frontend in production if dist/ exists
const distPath = fs.existsSync(path.join(__dirname, "../frontend/dist"))
  ? path.join(__dirname, "../frontend/dist")
  : path.join(__dirname, "../dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return res.status(404).json({ error: "Endpoint not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`Backend Express server listening at http://localhost:${PORT}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use by another process.`);
    console.error(`👉 Please free port ${PORT} or stop existing node processes.`);
    process.exit(1);
  } else {
    console.error("Backend Express server error:", err);
    process.exit(1);
  }
});



// Global Express Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Global express error handler caught:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
});

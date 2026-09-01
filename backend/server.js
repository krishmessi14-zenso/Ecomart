import express from "express";
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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// ---------------- AUTH ROUTES ----------------

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  try {
    let user;
    if (role) {
      user = await query.get(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND TRIM(password) = ? AND role = ?",
        [cleanEmail, cleanPassword, role]
      );
    } else {
      user = await query.get(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND TRIM(password) = ?",
        [cleanEmail, cleanPassword]
      );
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json(sanitizeUser(user));
  } catch (err) {
    console.error("Login database error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, role, name, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, securityQuestion, securityAnswer, about } = req.body;

  if (!email || !password || !role || !name || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: "Email, password, role, name, security question and answer are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await query.get("SELECT id FROM users WHERE LOWER(email) = ?", [normalizedEmail]);
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const prefix = role === "vendor" ? "f" : (role === "customer" ? "v" : "a");
    const id = generateId(prefix);
    const createdAt = new Date().toISOString();
    const verificationStatus = role === "vendor" ? "Pending" : "Verified";

    await query.run(
      `INSERT INTO users (id, email, password, role, name, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, securityQuestion, securityAnswer, verificationStatus, about, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email.trim(),
        password,
        role,
        name.trim(),
        storeName ? storeName.trim() : null,
        countryCode || "IN",
        countryName || "India",
        region ? region.trim() : null,
        district ? district.trim() : null,
        city ? city.trim() : null,
        postalCode ? postalCode.trim() : null,
        lat !== undefined ? parseFloat(lat) : null,
        lng !== undefined ? parseFloat(lng) : null,
        currency || "INR",
        securityQuestion,
        securityAnswer.trim(),
        verificationStatus,
        about || null,
        createdAt
      ]
    );

    const newUser = await query.get("SELECT * FROM users WHERE id = ?", [id]);
    res.status(201).json(sanitizeUser(newUser));
  } catch (err) {
    console.error("Registration database error:", err);
    res.status(500).json({ error: "Internal server error during registration." });
  }
});

// POST /api/auth/send-otp
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email address is required." });
  }

  try {
    const user = await query.get("SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: "No account found with this email address." });
    }

    // Generate 6-digit OTP code & 10-minute expiry
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    await query.run("UPDATE users SET resetOtpCode = ?, resetOtpExpiry = ? WHERE id = ?", [otpCode, otpExpiry, user.id]);

    console.log(`[ECO-MART OTP DEMO] Generated OTP ${otpCode} for user ${user.email} (expires in 10m)`);

    res.json({
      message: "Verification code sent to your email.",
      debugOtp: otpCode,
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Internal server error while sending verification code." });
  }
});

// POST /api/auth/verify-otp-only
app.post("/api/auth/verify-otp-only", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and 6-digit verification code are required." });
  }

  try {
    const user = await query.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (!user.resetOtpCode || user.resetOtpCode.trim() !== otp.toString().trim()) {
      return res.status(400).json({ error: "Invalid 6-digit verification code." });
    }

    if (!user.resetOtpExpiry || Date.now() > Number(user.resetOtpExpiry)) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    res.json({ message: "Verification code confirmed!" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Internal server error while verifying OTP code." });
  }
});

// POST /api/auth/verify-otp-reset-password
app.post("/api/auth/verify-otp-reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, 6-digit verification code, and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const user = await query.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (!user.resetOtpCode || user.resetOtpCode.trim() !== otp.toString().trim()) {
      return res.status(400).json({ error: "Invalid 6-digit verification code." });
    }

    if (!user.resetOtpExpiry || Date.now() > Number(user.resetOtpExpiry)) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    await query.run("UPDATE users SET password = ?, resetOtpCode = NULL, resetOtpExpiry = NULL WHERE id = ?", [newPassword, user.id]);

    console.log(`[ECO-MART OTP DEMO] Password reset successfully for ${user.email}`);

    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password via OTP error:", err);
    res.status(500).json({ error: "Internal server error while resetting password." });
  }
});

// POST /api/ai/chat
app.post("/api/ai/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const prompt = message.trim().toLowerCase();
    let responseText = "";

    if (prompt.includes("ecomart") || prompt.includes("what is")) {
      responseText = "🌱 **EcoMart** is a dedicated marketplace for sustainable, eco-friendly, and zero-waste products connecting verified vendors directly with eco-conscious customers across India.";
    } else if (prompt.includes("sell") || prompt.includes("vendor")) {
      responseText = "📦 Vendors can list sustainable products, specify eco-packaging metrics, set MOQs, configure tier pricing in INR (₹), and track live sales directly from their Vendor Dashboard.";
    } else if (prompt.includes("otp") || prompt.includes("password")) {
      responseText = "🔐 EcoMart uses a 6-digit OTP code sent to your email for fast and secure password recovery.";
    } else {
      responseText = `🤖 **EcoMart AI Assistant:** I received your query regarding "${message}". I can help guide you through browsing sustainable products, vendor registrations, EcoScore ratings, and delivery tracking!`;
    }

    res.json({ reply: responseText, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("AI Chat error:", err);
    res.status(500).json({ error: "Internal server error in AI Assistant." });
  }
});

// POST /api/auth/verify-security
app.post("/api/auth/verify-security", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const user = await query.get("SELECT securityQuestion FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: "No account found with this email address." });
    }
    res.json({ securityQuestion: user.securityQuestion });
  } catch (err) {
    console.error("Verify security question error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/auth/reset-password
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;

  if (!email || !securityAnswer || !newPassword) {
    return res.status(400).json({ error: "Email, security answer, and new password are required." });
  }

  try {
    const user = await query.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (!user.securityAnswer || user.securityAnswer.trim().toLowerCase() !== securityAnswer.trim().toLowerCase()) {
      return res.status(400).json({ error: "Incorrect security answer." });
    }

    await query.run("UPDATE users SET password = ? WHERE id = ?", [newPassword, user.id]);
    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// PUT /api/users/:id
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, securityQuestion, securityAnswer, password, about } = req.body;

  try {
    const user = await query.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const safeTrim = (val) => (typeof val === "string" ? val.trim() : val);

    await query.run(
      `UPDATE users 
       SET name = ?, storeName = ?, countryCode = ?, countryName = ?, region = ?, district = ?, city = ?, postalCode = ?, lat = ?, lng = ?, currency = ?, securityQuestion = ?, securityAnswer = ?, password = ?, about = ?
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
        securityQuestion !== undefined ? securityQuestion : user.securityQuestion,
        securityAnswer !== undefined ? safeTrim(securityAnswer) : user.securityAnswer,
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
app.get("/api/users", async (req, res) => {
  try {
    const users = await query.all("SELECT * FROM users ORDER BY createdAt DESC");
    res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// PUT /api/users/:id/verification (Admin approve/reject vendor verification)
app.put("/api/users/:id/verification", async (req, res) => {
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
      "INSERT INTO notifications (id, userId, text, type, read, createdAt) VALUES (?, ?, ?, 'verification', 0, ?)",
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

// POST /api/products
app.post("/api/products", async (req, res) => {
  const { name, category, grade, price, currency, unit, stock, vendorId, countryCode, region, district, city, lat, lng, description, imageUrl, moq, tierPrices, organic, harvestDate, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears } = req.body;

  if (!name || !category || !price || !unit || stock === undefined || !vendorId) {
    return res.status(400).json({ error: "Required fields: name, category, price, unit, stock, vendorId" });
  }

  const id = generateId("p");
  const createdAt = new Date().toISOString();
  const eco = computeEcoMetrics({ materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears });

  try {
    // Look up vendor's location and currency as fallback if not provided on product payload
    const vendor = await query.get("SELECT countryCode, region, district, city, lat, lng, currency FROM users WHERE id = ?", [vendorId]);

    await query.run(
      `INSERT INTO products (id, name, category, grade, price, currency, unit, stock, vendorId, countryCode, region, district, city, lat, lng, description, imageUrl, moq, tierPrices, organic, harvestDate, createdAt, status, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears, ecoScore, co2SavedKg, plasticSavedKg, waterSavedLiters, treesEquivalent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        category,
        grade || "A",
        price,
        currency || (vendor ? vendor.currency : "INR"),
        unit,
        stock,
        vendorId,
        countryCode || (vendor ? vendor.countryCode : "IN"),
        region || (vendor ? vendor.region : "Tamil Nadu"),
        district || (vendor ? vendor.district : "Thoothukudi"),
        city || (vendor ? vendor.city : "Kovilpatti"),
        lat !== undefined && lat !== null ? parseFloat(lat) : (vendor && vendor.lat ? vendor.lat : 9.1724),
        lng !== undefined && lng !== null ? parseFloat(lng) : (vendor && vendor.lng ? vendor.lng : 77.8687),
        description || "",
        imageUrl || "",
        moq || 1,
        tierPrices || "{}",
        organic || 0,
        harvestDate || null,
        createdAt,
        "pending",
        materialType || "standard",
        packagingType || "minimal_plastic",
        recyclability !== undefined ? recyclability : 80,
        isRenewableEnergy ? 1 : 0,
        lifespanYears !== undefined ? lifespanYears : 2,
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
        `INSERT INTO notifications (id, userId, text, type, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)`,
        [generateId("n"), admin.id, `New product "${name}" was submitted and is awaiting your approval.`, "product", createdAt]
      );
    }

    const newProduct = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Failed to create product." });
  }
});

// PUT /api/products/:id
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, grade, price, currency, unit, stock, countryCode, region, district, city, lat, lng, description, imageUrl, moq, tierPrices, organic, harvestDate, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears } = req.body;

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

    await query.run(
      `UPDATE products 
       SET name = ?, category = ?, grade = ?, price = ?, currency = ?, unit = ?, stock = ?, countryCode = ?, region = ?, district = ?, city = ?, lat = ?, lng = ?, description = ?, imageUrl = ?, moq = ?, tierPrices = ?, organic = ?, harvestDate = ?,
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
app.put("/api/products/:id/approval", async (req, res) => {
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
      `INSERT INTO notifications (id, userId, text, type, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)`,
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
app.delete("/api/products/:id", async (req, res) => {
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

// ---------------- ORDER ROUTES ----------------

// GET /api/orders
// Returns joined order items to keep backward compatibility with frontend pages
app.get("/api/orders", async (req, res) => {
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
app.post("/api/orders", async (req, res) => {
  const { customerId, customerName, deliveryCountry, deliveryRegion, deliveryDistrict, deliveryCity, deliveryPostalCode, deliveryAddress, paymentMethod, totalAmount, currency, items } = req.body;

  if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Required: customerName and non-empty items array." });
  }

  const orderId = `EM-${Math.floor(Math.random() * 9000 + 1000)}`;
  const createdAt = new Date().toISOString();
  // Award 1 Green Point per ₹100 spent, minimum 10 points per order
  const greenPointsEarned = Math.max(10, Math.round((Number(totalAmount) || 0) / 100));

  try {
    // 1. Insert Group Order
    await query.run(
      `INSERT INTO orders (id, customerId, customerName, deliveryCountry, deliveryRegion, deliveryDistrict, deliveryCity, deliveryPostalCode, deliveryAddress, paymentMethod, totalAmount, currency, status, greenPointsEarned, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [
        orderId,
        customerId || null,
        customerName,
        deliveryCountry || "India",
        deliveryRegion || null,
        deliveryDistrict || null,
        deliveryCity || null,
        deliveryPostalCode || null,
        deliveryAddress || null,
        paymentMethod || "cod",
        totalAmount,
        currency || "INR",
        greenPointsEarned,
        createdAt
      ]
    );

    // Credit Green Reward Points to the customer's account
    if (customerId) {
      await query.run("UPDATE users SET greenPoints = COALESCE(greenPoints, 0) + ? WHERE id = ?", [greenPointsEarned, customerId]);
      await query.run(
        `INSERT INTO notifications (id, userId, text, type, read, createdAt) VALUES (?, ?, ?, 'order', 0, ?)`,
        [generateId("n"), customerId, `Order ${orderId} placed successfully! You earned +${greenPointsEarned} Green Points.`, createdAt]
      );
    }

    // 2. Insert Order Items and update product stock
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = `${orderId}-${i + 1}`;

      // Server-side authoritative lookup of product to derive vendorId and name securely
      const product = await query.get("SELECT vendorId, name, price FROM products WHERE id = ?", [item.productId]);
      const vendorId = (product && product.vendorId) ? product.vendorId : (item.vendorId || null);
      const unitPrice = item.unitPrice || (product ? product.price : 0);
      const itemAmount = item.amount || (item.qty * unitPrice);

      // Insert Order Item
      await query.run(
        `INSERT INTO order_items (id, orderId, productId, vendorId, qty, unitPrice, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, item.productId, vendorId, item.qty, unitPrice, itemAmount]
      );

      // Decrement stock
      await query.run(
        "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
        [item.qty, item.productId]
      );

      // Create dynamic vendor notification
      if (vendorId) {
        const notifId = generateId("n");
        const notifText = `New order ${orderId} received for ${item.qty}x ${product ? product.name : "product"} from ${customerName}`;
        await query.run(
          `INSERT INTO notifications (id, userId, text, type, read, createdAt)
           VALUES (?, ?, ?, 'order', 0, ?)`,
          [notifId, vendorId, notifText, createdAt]
        );
      }
    }

    // Return joined rows reflecting all order items created for this order
    const createdJoined = await query.all(`
      SELECT o.*, oi.productId, oi.vendorId, oi.qty, oi.amount, oi.unitPrice, oi.id as itemId
      FROM orders o JOIN order_items oi ON o.id = oi.orderId
      WHERE o.id = ?
    `, [orderId]);

    res.status(201).json(createdJoined);
  } catch (err) {
    console.error("Create order database error:", err);
    res.status(500).json({ error: "Failed to place order." });
  }
});

// PUT /api/orders/:id (Update order status and notify user)
app.put("/api/orders/:id", async (req, res) => {
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
        `INSERT INTO notifications (id, userId, text, type, read, createdAt)
         VALUES (?, ?, ?, 'order', 0, ?)`,
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
app.get("/api/notifications", async (req, res) => {
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
app.post("/api/notifications", async (req, res) => {
  const { userId, text, type } = req.body;

  if (!userId || !text) {
    return res.status(400).json({ error: "userId and notification text are required." });
  }

  const id = generateId("n");
  const createdAt = new Date().toISOString();

  try {
    await query.run(
      `INSERT INTO notifications (id, userId, text, type, read, createdAt)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, userId, text, type || "system", createdAt]
    );

    const newNotif = await query.get("SELECT * FROM notifications WHERE id = ?", [id]);
    newNotif.read = !!newNotif.read;
    res.status(201).json(newNotif);
  } catch (err) {
    console.error("Create notification database error:", err);
    res.status(500).json({ error: "Failed to create notification." });
  }
});

// PUT /api/notifications/read-all
app.put("/api/notifications/read-all", async (req, res) => {
  const { userId } = req.body;

  try {
    if (userId) {
      await query.run("UPDATE notifications SET read = 1 WHERE userId = ?", [userId]);
    } else {
      await query.run("UPDATE notifications SET read = 1");
    }
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("Read all notifications error:", err);
    res.status(500).json({ error: "Failed to mark notifications read." });
  }
});

// PUT /api/notifications/:id/read
app.put("/api/notifications/:id/read", async (req, res) => {
  const { id } = req.params;

  try {
    await query.run("UPDATE notifications SET read = 1 WHERE id = ?", [id]);
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
app.post("/api/reviews", async (req, res) => {
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
app.delete("/api/reviews/:id", async (req, res) => {
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
app.get("/api/reports/vendor/:vendorId", async (req, res) => {
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
    let translated = null;

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
app.post("/api/coupons", async (req, res) => {
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
app.delete("/api/coupons/:id", async (req, res) => {
  try {
    await query.run("DELETE FROM coupons WHERE id = ?", [req.params.id]);
    res.json({ message: "Coupon removed successfully.", id: req.params.id });
  } catch (err) {
    console.error("Delete coupon database error:", err);
    res.status(500).json({ error: "Failed to delete coupon." });
  }
});

// POST /api/coupons/:id/redeem - a customer redeems Green Points for a coupon
app.post("/api/coupons/:id/redeem", async (req, res) => {
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
      `INSERT INTO notifications (id, userId, text, type, read, createdAt) VALUES (?, ?, ?, 'reward', 0, ?)`,
      [generateId("n"), customerId, `You redeemed ${coupon.pointsRequired} points for coupon ${coupon.code} (${coupon.discountPercentage}% off).`, new Date().toISOString()]
    );

    const updatedCustomer = await query.get("SELECT * FROM users WHERE id = ?", [customerId]);
    res.json({ message: "Coupon redeemed successfully!", coupon, user: sanitizeUser(updatedCustomer) });
  } catch (err) {
    console.error("Redeem coupon database error:", err);
    res.status(500).json({ error: "Failed to redeem coupon." });
  }
});

// ---------------- AI ECO ASSISTANT ----------------

const ECO_ASSISTANT_FAQ = [
  { keywords: ["eco score", "score"], reply: "The Eco Score (0-100) is calculated from a product's material type, packaging, recyclability percentage, use of renewable energy in manufacturing, and expected lifespan. Higher scores mean a lower environmental footprint." },
  { keywords: ["green point", "reward", "points"], reply: "You earn Green Reward Points on every order (1 point per ₹100 spent, minimum 10 points). Redeem them for discount coupons on your Eco Dashboard." },
  { keywords: ["carbon", "footprint", "co2"], reply: "Each product page shows estimated CO2 saved, plastic avoided, water saved, and tree-equivalents compared to a conventional alternative, based on its Eco Score." },
  { keywords: ["return", "refund"], reply: "You can request a return within 7 days of delivery from your Order History page. Sustainable packaging is reused wherever possible during returns." },
  { keywords: ["vendor", "sell", "become a vendor"], reply: "To sell on EcoMart, register with the Vendor role, complete your store profile, and submit products for Admin approval. Approved products appear in the marketplace immediately." },
  { keywords: ["shipping", "delivery"], reply: "Delivery timelines depend on your vendor's location and product availability. Track any order live from Order Tracking under your dashboard." },
  { keywords: ["payment"], reply: "EcoMart supports Cash on Delivery, UPI, and Card payments at checkout." },
  { keywords: ["wishlist"], reply: "Tap the heart icon on any product to save it to your Wishlist for later." },
  { keywords: ["cancel"], reply: "Orders can be cancelled from Order History while they are still in 'Pending' or 'Confirmed' status." }
];

// POST /api/ai/chat - lightweight rule-based EcoMart assistant (no external API key required)
app.post("/api/ai/chat", (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A 'message' string is required." });
  }

  const lower = message.toLowerCase();
  const match = ECO_ASSISTANT_FAQ.find((entry) => entry.keywords.some((k) => lower.includes(k)));

  const reply = match
    ? match.reply
    : "I'm the EcoMart Eco Assistant! Ask me about Eco Scores, Green Reward Points, carbon footprint, shipping, payments, returns, or becoming a vendor.";

  res.json({ reply });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Backend Express server listening at http://localhost:${PORT}`);
});


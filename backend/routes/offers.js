import express from "express";
import jwt from "jsonwebtoken";
import { query } from "../database.js";

const router = express.Router();

const getJwtSecret = () => {
  return process.env.JWT_SECRET || "ecomart_dev_jwt_secret_key_change_in_production";
};

// Middleware: Authenticate user & verify role from token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication token is required." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// 1. GET /api/offers/active - Public / Customer endpoint
// Returns only APPROVED offers within active date range (now >= startDate && now <= endDate)
router.get("/active", async (req, res) => {
  try {
    const rawOffers = await query.all("SELECT * FROM offers WHERE status = 'approved'");
    const now = new Date();

    const activeOffers = (rawOffers || []).filter((o) => {
      if (o.status !== "approved") return false;
      const start = new Date(o.startDate);
      const end = new Date(o.endDate);
      return now >= start && now <= end;
    }).map((o) => {
      let parsedProducts;
      try {
        parsedProducts = typeof o.productIds === "string" ? JSON.parse(o.productIds) : (o.productIds || []);
      } catch {
        parsedProducts = [];
      }
      return {
        id: o.id,
        vendorId: o.vendorId,
        title: o.title,
        description: o.description,
        type: o.type || "percentage",
        discountValue: Number(o.discountValue),
        productIds: parsedProducts,
        couponCode: o.couponCode,
        startDate: o.startDate,
        endDate: o.endDate,
        status: o.status
      };
    });

    res.json({ offers: activeOffers });
  } catch (err) {
    console.error("GET /api/offers/active error:", err);
    res.status(500).json({ error: "Failed to fetch active offers." });
  }
});

// 2. GET /api/offers/vendor - Vendor endpoint to view own created offers
router.get("/vendor", authenticateToken, async (req, res) => {
  if (!req.user || req.user.role !== "vendor") {
    return res.status(403).json({ error: "Access denied. Vendor role required." });
  }

  try {
    const rawOffers = await query.all("SELECT * FROM offers WHERE vendorId = ?", [req.user.id]);
    const formatted = (rawOffers || []).map((o) => {
      let parsedProducts;
      try {
        parsedProducts = typeof o.productIds === "string" ? JSON.parse(o.productIds) : (o.productIds || []);
      } catch {
        parsedProducts = [];
      }
      return {
        ...o,
        discountValue: Number(o.discountValue),
        productIds: parsedProducts
      };
    });
    res.json({ offers: formatted });
  } catch (err) {
    console.error("GET /api/offers/vendor error:", err);
    res.status(500).json({ error: "Failed to fetch vendor offers." });
  }
});

// 3. POST /api/offers/vendor - Vendor endpoint to create an offer
router.post("/vendor", authenticateToken, async (req, res) => {
  if (!req.user || req.user.role !== "vendor") {
    return res.status(403).json({ error: "Access denied. Vendor role required." });
  }

  const { title, description = "", type = "percentage", discountValue, productIds = [], couponCode = "", startDate, endDate } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Offer title is required." });
  }

  const numDiscount = Number(discountValue);
  if (isNaN(numDiscount) || numDiscount < 1 || numDiscount > 90) {
    return res.status(400).json({ error: "Discount percentage must be between 1% and 90%." });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and End date are required." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "End date must be strictly after Start date." });
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: "Please select at least one product for this offer." });
  }

  try {
    // Security check: Verify selected productIds belong to this vendor
    const vendorProds = await query.all("SELECT id FROM products WHERE vendorId = ?", [req.user.id]);
    const validVendorProdIds = (vendorProds || []).map((p) => p.id);
    const unauthorizedProducts = productIds.filter((pid) => !validVendorProdIds.includes(pid));

    if (unauthorizedProducts.length > 0) {
      return res.status(403).json({ error: "You can only create offers for products in your own store catalog." });
    }

    const offerId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    await query.run(
      `INSERT INTO offers (id, vendorId, title, description, type, discountValue, productIds, couponCode, startDate, endDate, status, rejectionReason, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offerId,
        req.user.id,
        title.trim(),
        description.trim(),
        type,
        numDiscount,
        JSON.stringify(productIds),
        couponCode ? String(couponCode).trim().toUpperCase() : `OFFER${Math.floor(1000 + Math.random() * 9000)}`,
        start.toISOString(),
        end.toISOString(),
        "pending",
        null,
        nowIso,
        nowIso
      ]
    );

    res.status(201).json({
      success: true,
      message: "Offer submitted successfully and sent for Admin Approval!",
      offerId
    });
  } catch (err) {
    console.error("POST /api/offers/vendor error:", err);
    res.status(500).json({ error: "Failed to create offer." });
  }
});

// 4. GET /api/offers/admin/pending - Admin endpoint listing pending offer approvals
router.get("/admin/pending", authenticateToken, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  try {
    const rawOffers = await query.all("SELECT * FROM offers WHERE status = 'pending'");
    const formatted = (rawOffers || []).map((o) => {
      let parsedProducts;
      try {
        parsedProducts = typeof o.productIds === "string" ? JSON.parse(o.productIds) : (o.productIds || []);
      } catch {
        parsedProducts = [];
      }
      return {
        ...o,
        discountValue: Number(o.discountValue),
        productIds: parsedProducts
      };
    });
    res.json({ offers: formatted });
  } catch (err) {
    console.error("GET /api/offers/admin/pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending offers." });
  }
});

// 5. POST /api/offers/admin/:id/approve - Admin endpoint to approve offer
router.post("/admin/:id/approve", authenticateToken, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  const { id } = req.params;

  try {
    const offer = await query.get("SELECT * FROM offers WHERE id = ?", [id]);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found." });
    }

    await query.run("UPDATE offers SET status = 'approved', rejectionReason = NULL WHERE id = ?", [id]);

    // Create notification for vendor
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await query.run(
      `INSERT INTO notifications (id, userId, text, type, \`read\`, createdAt) VALUES (?, ?, ?, ?, 0, ?)`,
      [notifId, offer.vendorId, `🎉 Offer Approved: Your offer "${offer.title}" has been approved and is now active!`, "offer_status", new Date().toISOString()]
    );

    res.json({ success: true, message: `Offer '${offer.title}' has been approved.` });
  } catch (err) {
    console.error("POST /api/offers/admin/:id/approve error:", err);
    res.status(500).json({ error: "Failed to approve offer." });
  }
});

// 6. POST /api/offers/admin/:id/reject - Admin endpoint to reject offer (rejectionReason required)
router.post("/admin/:id/reject", authenticateToken, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  const { id } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason || typeof rejectionReason !== "string" || !rejectionReason.trim()) {
    return res.status(400).json({ error: "A rejection reason is required when rejecting an offer." });
  }

  try {
    const offer = await query.get("SELECT * FROM offers WHERE id = ?", [id]);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found." });
    }

    await query.run("UPDATE offers SET status = 'rejected', rejectionReason = ? WHERE id = ?", [rejectionReason.trim(), id]);

    // Create notification for vendor
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await query.run(
      `INSERT INTO notifications (id, userId, text, type, \`read\`, createdAt) VALUES (?, ?, ?, ?, 0, ?)`,
      [notifId, offer.vendorId, `⚠️ Offer Rejected: Your offer "${offer.title}" was rejected. Reason: ${rejectionReason.trim()}`, "offer_status", new Date().toISOString()]
    );

    res.json({ success: true, message: `Offer '${offer.title}' rejected.` });
  } catch (err) {
    console.error("POST /api/offers/admin/:id/reject error:", err);
    res.status(500).json({ error: "Failed to reject offer." });
  }
});

export default router;

import express from "express";
import {
  getOrderTimeline,
  updateOrderStatus,
  DELIVERY_STATUSES
} from "../services/deliveryService.js";
import { query } from "../database.js";

const router = express.Router();

// GET /api/delivery/statuses - List all valid delivery lifecycle statuses
router.get("/statuses", (req, res) => {
  res.json({ statuses: DELIVERY_STATUSES });
});

// GET /api/delivery/:orderId/timeline - Get full timeline, ETA, and history log
router.get("/:orderId/timeline", async (req, res) => {
  const { orderId } = req.params;
  try {
    const timeline = await getOrderTimeline(orderId);
    if (!timeline) {
      return res.status(404).json({ error: `Order '${orderId}' not found.` });
    }
    res.json(timeline);
  } catch (err) {
    console.error("Fetch order timeline error:", err);
    res.status(500).json({ error: "Failed to fetch delivery timeline." });
  }
});

// GET /api/delivery/:orderId/history - Get status history audit records
router.get("/:orderId/history", async (req, res) => {
  const { orderId } = req.params;
  try {
    const history = await query.all(
      "SELECT * FROM order_status_history WHERE orderId = ? ORDER BY timestamp ASC",
      [orderId]
    );
    res.json(history || []);
  } catch (err) {
    console.error("Fetch order status history error:", err);
    res.status(500).json({ error: "Failed to fetch status history." });
  }
});

// PUT /api/delivery/:orderId/status - Controlled status transition update
router.put("/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status, message, location } = req.body;

  if (!status) {
    return res.status(400).json({ error: "New 'status' field is required." });
  }

  try {
    const user = req.user || { id: "system", role: "admin", name: "System Admin" };
    const updatedTimeline = await updateOrderStatus({
      orderId,
      newStatus: status,
      message,
      location,
      user
    });
    res.json({ success: true, message: `Order status updated to ${status}.`, timeline: updatedTimeline });
  } catch (err) {
    console.error("Update delivery status error:", err);
    res.status(400).json({ error: err.message || "Failed to update delivery status." });
  }
});

// GET /api/delivery/analytics - Admin Delivery Analytics
router.get("/analytics/overview", async (req, res) => {
  try {
    const orders = await query.all("SELECT id, status, createdAt FROM orders");
    const totalOrders = orders.length;

    const counts = {
      "Order Placed": 0,
      "Payment Confirmed": 0,
      "Accepted by Vendor": 0,
      "Preparing": 0,
      "Packed": 0,
      "Ready for Pickup": 0,
      "Picked Up": 0,
      "In Transit": 0,
      "Out for Delivery": 0,
      "Delivered": 0,
      "Cancelled": 0,
      "Delayed": 0
    };

    const nowMs = Date.now();

    orders.forEach((o) => {
      const s = o.status || "Order Placed";
      if (s.includes("Cancel") || s.includes("Reject")) {
        counts["Cancelled"]++;
      } else if (counts[s] !== undefined) {
        counts[s]++;
      } else {
        counts["Order Placed"]++;
      }

      // Check delay criteria
      const createdAtMs = new Date(o.createdAt || 0).getTime();
      if (!s.includes("Delivered") && !s.includes("Cancel") && (nowMs - createdAtMs > 48 * 3600 * 1000)) {
        counts["Delayed"]++;
      }
    });

    const completionRate = totalOrders > 0 ? parseFloat(((counts["Delivered"] / totalOrders) * 100).toFixed(1)) : 0;
    const cancellationRate = totalOrders > 0 ? parseFloat(((counts["Cancelled"] / totalOrders) * 100).toFixed(1)) : 0;

    res.json({
      totalOrders,
      completionRate,
      cancellationRate,
      counts
    });
  } catch (err) {
    console.error("Delivery analytics error:", err);
    res.status(500).json({ error: "Failed to fetch delivery analytics." });
  }
});

export default router;

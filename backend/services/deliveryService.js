import { query } from "../database.js";

// Official EcoMart Delivery Lifecycle Statuses
export const DELIVERY_STATUSES = [
  "Order Placed",
  "Payment Confirmed",
  "Accepted by Vendor",
  "Preparing",
  "Packed",
  "Ready for Pickup",
  "Picked Up",
  "In Transit",
  "Out for Delivery",
  "Delivered",
  "Cancelled by Customer",
  "Rejected by Vendor",
  "Cancelled by Admin"
];

// Map legacy status strings to canonical delivery lifecycle statuses
export function normalizeStatus(statusStr) {
  if (!statusStr) return "Order Placed";
  const s = statusStr.trim().toLowerCase();
  if (s === "pending" || s === "order placed") return "Order Placed";
  if (s === "confirmed" || s === "payment confirmed") return "Payment Confirmed";
  if (s === "accepted" || s === "accepted by vendor") return "Accepted by Vendor";
  if (s === "preparing" || s === "processing") return "Preparing";
  if (s === "packed") return "Packed";
  if (s === "ready for pickup" || s === "ready_for_pickup") return "Ready for Pickup";
  if (s === "picked up" || s === "picked_up") return "Picked Up";
  if (s === "in transit" || s === "in_transit" || s === "shipped") return "In Transit";
  if (s === "out for delivery" || s === "out_for_delivery") return "Out for Delivery";
  if (s === "delivered" || s === "completed") return "Delivered";
  if (s.includes("cancel") && s.includes("customer")) return "Cancelled by Customer";
  if (s.includes("reject") || (s.includes("cancel") && s.includes("vendor"))) return "Rejected by Vendor";
  if (s.includes("cancel")) return "Cancelled by Admin";
  return statusStr;
}

// Calculate Estimated Delivery Date (ETA) based on order placement date
export function calculateEstimatedDelivery(createdAtStr, windowDays = 4) {
  try {
    const orderDate = createdAtStr ? new Date(createdAtStr) : new Date();
    if (isNaN(orderDate.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + windowDays);
      return fallback.toISOString().split("T")[0];
    }
    const etaDate = new Date(orderDate);
    etaDate.setDate(etaDate.getDate() + windowDays);
    return etaDate.toISOString().split("T")[0];
  } catch {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + windowDays);
    return fallback.toISOString().split("T")[0];
  }
}

// Validate status transition state machine
export function isValidTransition(currentStatusRaw, newStatusRaw, userRole) {
  const current = normalizeStatus(currentStatusRaw);
  const next = normalizeStatus(newStatusRaw);

  if (current === next) return true;

  // Admin can perform authorized status updates
  if (userRole === "admin") return true;

  // Terminal states cannot transition further
  if (["Delivered", "Cancelled by Customer", "Rejected by Vendor", "Cancelled by Admin"].includes(current)) {
    return false;
  }

  // Allow cancellations from non-delivered states
  if (["Cancelled by Customer", "Rejected by Vendor", "Cancelled by Admin"].includes(next)) {
    if (next === "Cancelled by Customer" && userRole === "customer" && ["Order Placed", "Payment Confirmed"].includes(current)) {
      return true;
    }
    if (next === "Rejected by Vendor" && userRole === "vendor" && ["Order Placed", "Payment Confirmed", "Accepted by Vendor"].includes(current)) {
      return true;
    }
    if (userRole === "admin") return true;
  }

  const validTransitions = {
    "Order Placed": ["Payment Confirmed", "Accepted by Vendor", "Cancelled by Customer", "Rejected by Vendor"],
    "Payment Confirmed": ["Accepted by Vendor", "Preparing", "Cancelled by Customer", "Rejected by Vendor"],
    "Accepted by Vendor": ["Preparing", "Packed", "Rejected by Vendor"],
    "Preparing": ["Packed", "Ready for Pickup"],
    "Packed": ["Ready for Pickup", "Picked Up", "In Transit"],
    "Ready for Pickup": ["Picked Up", "In Transit"],
    "Picked Up": ["In Transit", "Out for Delivery"],
    "In Transit": ["Out for Delivery", "Delivered"],
    "Out for Delivery": ["Delivered"]
  };

  const allowed = validTransitions[current] || [];
  return allowed.includes(next);
}

// Record status update into order_status_history audit table
export async function createStatusHistoryRecord(orderId, statusRaw, message = "", location = "", updatedBy = "System", updatedByRole = "system") {
  const status = normalizeStatus(statusRaw);
  const id = `osh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();

  try {
    await query.run(
      `INSERT INTO order_status_history (id, orderId, status, message, location, updatedBy, updatedByRole, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderId, status, message, location || "EcoMart Fulfillment Center", updatedBy, updatedByRole, timestamp]
    );
  } catch (err) {
    console.error("Failed to insert status history record:", err);
  }

  return { id, orderId, status, message, location, updatedBy, updatedByRole, timestamp };
}

// Get full order timeline and history
export async function getOrderTimeline(orderId) {
  const order = await query.get("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!order) return null;

  const currentStatus = normalizeStatus(order.status);
  const items = await query.all(
    `SELECT oi.*, p.name as productName, p.imageUrl, p.materialType, p.packagingType, u.name as vendorName, u.storeName
     FROM order_items oi
     LEFT JOIN products p ON oi.productId = p.id
     LEFT JOIN users u ON oi.vendorId = u.id
     WHERE oi.orderId = ?`,
    [orderId]
  );

  let history = await query.all(
    "SELECT * FROM order_status_history WHERE orderId = ? ORDER BY timestamp ASC",
    [orderId]
  );

  // If no history records exist yet, generate initial entry from order createdAt
  if (!history || history.length === 0) {
    const initialHist = await createStatusHistoryRecord(
      orderId,
      currentStatus,
      `Order ${orderId} placed and registered in EcoMart system.`,
      "EcoMart Central Logistics Hub",
      order.customerName || "Customer",
      "customer"
    );
    history = [initialHist];
  }

  const steps = [
    { key: "Order Placed", label: "Order Placed", desc: "Order submitted by customer" },
    { key: "Payment Confirmed", label: "Payment Confirmed", desc: "Payment verified via Razorpay/COD" },
    { key: "Accepted by Vendor", label: "Accepted by Vendor", desc: "Vendor confirmed order availability" },
    { key: "Preparing", label: "Preparing", desc: "Product being eco-packaged" },
    { key: "Packed", label: "Packed", desc: "Zero-waste packaging complete" },
    { key: "Ready for Pickup", label: "Ready for Pickup", desc: "Awaiting courier pickup" },
    { key: "In Transit", label: "In Transit", desc: "On the move via eco-courier" },
    { key: "Out for Delivery", label: "Out for Delivery", desc: "Local courier out for delivery" },
    { key: "Delivered", label: "Delivered", desc: "Package delivered to customer" }
  ];

  const isCancelled = currentStatus.includes("Cancelled") || currentStatus.includes("Rejected");
  const activeStepIndex = isCancelled ? -1 : steps.findIndex((s) => s.key === currentStatus);

  // Check if order is delayed (e.g. created > 2 days ago and still in Preparing/Payment Confirmed)
  const createdAtMs = new Date(order.createdAt || 0).getTime();
  const nowMs = Date.now();
  const isDelayed = !isCancelled && currentStatus !== "Delivered" && (nowMs - createdAtMs > 48 * 3600 * 1000);

  const estimatedDelivery = calculateEstimatedDelivery(order.createdAt, 4);

  return {
    order: {
      ...order,
      status: currentStatus
    },
    items,
    steps,
    activeStepIndex: activeStepIndex >= 0 ? activeStepIndex : 0,
    currentStatus,
    isCancelled,
    isDelayed,
    estimatedDelivery,
    history
  };
}

// Update order status with validation, status history log, and user notification
export async function updateOrderStatus({ orderId, newStatus, message, location, user }) {
  const order = await query.get("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!order) throw new Error(`Order '${orderId}' not found.`);

  const normalizedNew = normalizeStatus(newStatus);
  const currentStatus = normalizeStatus(order.status);
  const userRole = user ? user.role : "admin";
  const updatedBy = user ? (user.name || user.email) : "System";

  if (!isValidTransition(currentStatus, normalizedNew, userRole)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${normalizedNew}'.`);
  }

  // Update order record
  await query.run("UPDATE orders SET status = ? WHERE id = ?", [normalizedNew, orderId]);

  // Log status history
  const historyRecord = await createStatusHistoryRecord(
    orderId,
    normalizedNew,
    message || `Status updated to ${normalizedNew}`,
    location || "EcoMart Logistics Facility",
    updatedBy,
    userRole
  );

  // Notify customer
  if (order.customerId) {
    const notifText = `Order ${orderId} status update: ${normalizedNew}. ${message ? "(" + message + ")" : ""}`;
    await query.run(
      "INSERT INTO notifications (id, userId, text, type, `read`, createdAt) VALUES (?, ?, ?, 'order', 0, ?)",
      [`n_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, order.customerId, notifText, new Date().toISOString()]
    );
  }

  // If marked Delivered, increment vendor completed orders counter
  if (normalizedNew === "Delivered") {
    const items = await query.all("SELECT DISTINCT vendorId FROM order_items WHERE orderId = ?", [orderId]);
    for (const item of items) {
      if (item.vendorId) {
        await query.run("UPDATE users SET completedOrders = COALESCE(completedOrders, 0) + 1 WHERE id = ?", [item.vendorId]);
      }
    }
  }

  return getOrderTimeline(orderId);
}

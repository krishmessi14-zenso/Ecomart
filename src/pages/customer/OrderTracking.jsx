import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Check,
  Truck as TruckIcon,
  ClipboardList,
  X,
  RefreshCw,
  AlertTriangle,
  Calendar,
  MapPin,
  Package,
  ChevronDown,
  ChevronUp
} from "../../components/icons/Icons.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Card } from "../../components/common/Card.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { getProductImage } from "../../utils/constants.js";
import { useData } from "../../hooks/useData.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { apiFetch } from "../../services/api.js";

const ALL_STAGES = [
  "Order Placed",
  "Payment Confirmed",
  "Accepted by Vendor",
  "Preparing",
  "Packed",
  "Ready for Pickup",
  "Picked Up",
  "In Transit",
  "Out for Delivery",
  "Delivered"
];

const STAGE_ADVANCE_MAP = {
  "Order Placed": { next: "Accepted by Vendor", label: "Accept Order" },
  "Pending": { next: "Accepted by Vendor", label: "Accept Order" },
  "Payment Confirmed": { next: "Accepted by Vendor", label: "Accept Order" },
  "Accepted by Vendor": { next: "Preparing", label: "Start Preparing" },
  "Accepted": { next: "Preparing", label: "Start Preparing" },
  "Preparing": { next: "Packed", label: "Pack Order" },
  "Packed": { next: "Ready for Pickup", label: "Ready for Pickup" },
  "Ready for Pickup": { next: "Picked Up", label: "Mark Picked Up" },
  "Picked Up": { next: "In Transit", label: "Ship / In Transit" },
  "In Transit": { next: "Out for Delivery", label: "Out for Delivery" },
  "Out for Delivery": { next: "Delivered", label: "Mark Delivered" }
};

function getBadgeVariant(status = "") {
  const s = status.toLowerCase();
  if (s.includes("delivered")) return "success";
  if (s.includes("cancel") || s.includes("reject")) return "danger";
  if (s.includes("pending") || s.includes("placed")) return "warning";
  return "info";
}

function TrackingTimeline({ order, timelineData }) {
  const currentStatus = timelineData?.currentStatus || order.status || "Order Placed";
  const isCancelled = timelineData?.isCancelled || currentStatus.includes("Cancelled") || currentStatus.includes("Rejected");

  if (isCancelled) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--danger-light)",
          border: "1px solid var(--danger-border)",
          color: "var(--danger)",
          padding: "12px 16px",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          fontWeight: 700,
          marginTop: 16
        }}
      >
        <X size={18} />
        <span>Order Delivery Cancelled: {currentStatus}</span>
      </div>
    );
  }

  let currentIdx = ALL_STAGES.findIndex((s) => s.toLowerCase() === currentStatus.toLowerCase());
  if (currentIdx === -1) {
    if (currentStatus === "Pending") currentIdx = 0;
    else if (currentStatus === "Accepted") currentIdx = 2;
    else if (currentStatus === "Confirmed") currentIdx = 1;
    else currentIdx = 0;
  }

  const progressPercent = Math.min(100, Math.max(0, (currentIdx / (ALL_STAGES.length - 1)) * 100));

  return (
    <div style={{ marginTop: 24, marginBottom: 20 }}>
      {/* Desktop Stepper Bar */}
      <div style={{ position: "relative", padding: "0 10px", marginBottom: 30 }}>
        {/* Background track line */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 20,
            right: 20,
            height: 3,
            background: "var(--border)",
            zIndex: 0
          }}
        />
        {/* Active progress fill line */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 20,
            width: `calc(${progressPercent}% - 20px)`,
            height: 3,
            background: "var(--brand)",
            transition: "width 0.4s ease",
            zIndex: 0
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          {ALL_STAGES.map((stage, idx) => {
            const isDone = idx < currentIdx;
            const isActive = idx === currentIdx;

            let bgColor = "var(--surface)";
            let textColor = "var(--text-soft)";
            let borderColor = "var(--border)";

            if (isDone) {
              bgColor = "var(--brand)";
              textColor = "#ffffff";
              borderColor = "var(--brand)";
            } else if (isActive) {
              bgColor = "var(--brand-light)";
              textColor = "var(--brand)";
              borderColor = "var(--brand)";
            }

            return (
              <div
                key={stage}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 68,
                  textAlign: "center"
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: bgColor,
                    color: textColor,
                    border: `2px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    boxShadow: isActive ? "0 0 0 4px var(--brand-light)" : "none",
                    transition: "all 0.2s ease"
                  }}
                >
                  {isDone ? <Check size={14} /> : isActive ? <RefreshCw size={13} style={{ animation: "spin 2s linear infinite" }} /> : idx + 1}
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    marginTop: 6,
                    fontWeight: isActive ? 800 : isDone ? 700 : 500,
                    color: isActive ? "var(--brand)" : isDone ? "var(--text)" : "var(--text-soft)",
                    lineHeight: 1.2
                  }}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Phase Banner */}
      <div
        style={{
          background: "var(--brand-light)",
          border: "1px solid var(--brand-border)",
          padding: "14px 18px",
          borderRadius: "var(--radius-md)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--brand-dark)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)" }} />
          <span>Active Delivery Phase: {currentStatus}</span>
        </div>
        {timelineData?.estimatedDelivery && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--brand-dark)",
              background: "var(--surface)",
              padding: "4px 10px",
              borderRadius: 20,
              border: "1px solid var(--brand-border)"
            }}
          >
            <Calendar size={13} />
            <span>Expected Delivery: {timelineData.estimatedDelivery}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderTrackingBase() {
  const { t } = useLanguage();
  const { orders, products, updateOrderStatus, refreshData } = useData();
  const { user: currentUser } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [timelines, setTimelines] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});
  const [cancellingId, setCancellingId] = useState(null);
  const [advancingId, setAdvancingId] = useState(null);

  // Review state
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImageUrl, setReviewImageUrl] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedItemIds, setReviewedItemIds] = useState({});

  const handleOpenReview = (item, prod) => {
    setReviewModalItem({ item, product: prod });
    setReviewRating(5);
    setReviewComment("");
    setReviewImageUrl("");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      notifyError("Written review comment is required.");
      return;
    }
    setSubmittingReview(true);
    try {
      const targetProdId = reviewModalItem.product?.id || reviewModalItem.item.productId;
      const targetVendorId = reviewModalItem.product?.vendorId || reviewModalItem.item.vendorId;

      const res = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: targetProdId,
          vendorId: targetVendorId,
          customerId: currentUser?.id || "u_customer",
          customerName: currentUser?.name || "Verified Customer",
          rating: reviewRating,
          comment: reviewComment.trim(),
          imageUrl: reviewImageUrl.trim() || null
        })
      });

      if (res.ok) {
        notifySuccess("Thank you! Product review submitted successfully.");
        const key = reviewModalItem.item.itemId || reviewModalItem.item.id;
        setReviewedItemIds((prev) => ({ ...prev, [key]: true }));
        setReviewModalItem(null);
      } else {
        const errData = await res.json();
        notifyError(errData.error || "Failed to submit review.");
      }
    } catch {
      notifyError("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter orders for current customer / vendor
  const customerOrders = useMemo(() => {
    const list = orders.filter((o) => {
      if (currentUser?.role === "vendor") {
        return o.vendorId && String(o.vendorId) === String(currentUser.id);
      }
      return (currentUser?.id && o.customerId === currentUser.id) || (currentUser?.name && o.customerName === currentUser.name);
    });
    if (orderId) {
      const match = list.find((o) => o.id === orderId);
      return match ? [match] : [];
    }
    return list;
  }, [orders, currentUser, orderId]);

  // Group items by unique Order ID
  const groupedOrders = useMemo(() => {
    const groups = {};
    customerOrders.forEach((o) => {
      if (!groups[o.id]) {
        groups[o.id] = {
          id: o.id,
          customerName: o.customerName,
          deliveryAddress: o.deliveryAddress,
          paymentMethod: o.paymentMethod,
          totalAmount: o.totalAmount,
          currency: o.currency,
          status: o.status,
          createdAt: o.createdAt,
          items: []
        };
      }
      groups[o.id].items.push(o);
    });
    return Object.values(groups).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [customerOrders]);

  // Fetch delivery timeline and history audit log for each order
  const fetchTimeline = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/delivery/${id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimelines((prev) => ({ ...prev, [id]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch timeline for order ${id}:`, err);
    }
  }, []);

  useEffect(() => {
    groupedOrders.forEach((g) => {
      fetchTimeline(g.id);
    });
  }, [groupedOrders, fetchTimeline]);

  // Advance delivery status
  const handleAdvanceStatus = async (orderId, nextStatus) => {
    setAdvancingId(orderId);
    try {
      const res = await fetch(`/api/delivery/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {})
        },
        body: JSON.stringify({
          status: nextStatus,
          message: `Status updated to ${nextStatus}`
        })
      });

      if (res.ok) {
        if (updateOrderStatus) updateOrderStatus(orderId, nextStatus);
        notifySuccess(`Order #${orderId} updated to: ${nextStatus}`);
        fetchTimeline(orderId);
        if (refreshData) refreshData();
      } else {
        const err = await res.json();
        notifyError(err.error || "Failed to update order status.");
      }
    } catch {
      notifyError("Failed to update order status.");
    } finally {
      setAdvancingId(null);
    }
  };

  // Handle customer order cancellation when eligible
  const handleCancelOrder = async (id) => {
    if (!window.confirm(`Are you sure you want to cancel order #${id}?`)) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/delivery/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {})
        },
        body: JSON.stringify({
          status: "Cancelled by Customer",
          message: "Cancelled directly by customer via tracking page."
        })
      });

      if (res.ok) {
        notifySuccess(`Order #${id} was cancelled successfully.`);
        fetchTimeline(id);
        if (refreshData) refreshData();
      } else {
        const err = await res.json();
        notifyError(err.error || "Failed to cancel order.");
      }
    } catch {
      notifyError("Failed to cancel order.");
    } finally {
      setCancellingId(null);
    }
  };

  const toggleHistory = (id) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getProduct = (prodId) => products.find((p) => p.id === prodId);

  const pageTitle = t("navigation.orderTracking") || t("orderTracking") || "Order Delivery Tracking";

  if (groupedOrders.length === 0) {
    return (
      <div className="fc-page-transition" style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <h1 className="fc-h1" style={{ marginBottom: 20 }}>{pageTitle}</h1>
        <EmptyState
          icon={<TruckIcon size={36} />}
          title={t("noOrdersYet") || "No Active Deliveries"}
          description="You haven't placed any sustainable orders on EcoMart yet."
          action={
            <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
              {t("browseMarketplace")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="fc-page-transition" style={{ padding: "24px", maxWidth: 1080, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 className="fc-h1" style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{pageTitle}</h1>
          <p className="fc-muted" style={{ margin: "4px 0 0 0", fontSize: 13 }}>
            Real-time delivery progress, ETA timelines, and zero-waste shipping history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/customer/marketplace")} style={{ fontWeight: 700 }}>
          ← Continue Shopping
        </Button>
      </div>

      {groupedOrders.map((o) => {
        const timeline = timelines[o.id];
        const status = timeline?.currentStatus || o.status || "Order Placed";
        const isEligibleCancel = ["Order Placed", "Payment Confirmed", "Pending"].includes(status);
        const stageAdvance = STAGE_ADVANCE_MAP[status];

        return (
          <Card
            key={o.id}
            style={{
              padding: "24px",
              marginBottom: 24,
              boxShadow: "var(--shadow-sm)",
              borderRadius: "var(--radius-md)"
            }}
          >
            {/* Order Card Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                paddingBottom: 16,
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div>
                <h3 className="fc-h3" style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Order #{o.id}</span>
                  {timeline?.isDelayed && (
                    <Badge variant="warning" style={{ fontSize: 11, fontWeight: 800 }}>
                      <AlertTriangle size={12} style={{ marginRight: 4 }} /> Delivery Delayed
                    </Badge>
                  )}
                </h3>
                <p className="fc-soft" style={{ margin: "4px 0 0 0", fontSize: 12.5 }}>
                  Placed on {formatDate(o.createdAt)} • Total:{" "}
                  <strong style={{ color: "var(--brand)", fontSize: 14 }}>{formatCurrency(o.totalAmount, o.currency)}</strong>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Advance Order Status Button (For Vendor/Admin or Next Stage) */}
                {stageAdvance && (currentUser?.role === "vendor" || currentUser?.role === "admin") && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={advancingId === o.id}
                    onClick={() => handleAdvanceStatus(o.id, stageAdvance.next)}
                    style={{ fontWeight: 700 }}
                  >
                    {advancingId === o.id ? "Updating..." : `➡️ ${stageAdvance.label}`}
                  </Button>
                )}

                {/* Cancel Button */}
                {isEligibleCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancellingId === o.id}
                    onClick={() => handleCancelOrder(o.id)}
                    style={{ color: "var(--danger)", borderColor: "var(--danger-border)", fontWeight: 700 }}
                  >
                    {cancellingId === o.id ? "Cancelling..." : "Cancel Order"}
                  </Button>
                )}

                <Badge variant={getBadgeVariant(status)} style={{ fontSize: 12, fontWeight: 800, padding: "6px 14px" }}>
                  {status}
                </Badge>
              </div>
            </div>

            {/* Stepper Timeline Bar */}
            <TrackingTimeline order={o} timelineData={timeline} />

            {/* Shipment Contents List */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, margin: "0 0 10px 0", color: "var(--text)" }}>Shipment Contents</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {o.items.map((item, idx) => {
                  const prod = getProduct(item.productId);
                  const img = getProductImage(prod);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--bg-soft)",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        fontSize: 13
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src={img}
                          alt={prod?.name || "Product"}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                        />
                        <div>
                          <strong style={{ color: "var(--text)" }}>{prod?.name || item.productId}</strong>
                          <div className="fc-soft" style={{ fontSize: 11.5 }}>
                            Qty: {item.qty} units × {formatCurrency(item.unitPrice || (item.amount / item.qty), o.currency)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <strong style={{ fontSize: 14, color: "var(--brand)" }}>{formatCurrency(item.amount, o.currency)}</strong>
                        {status === "Delivered" && (
                          reviewedItemIds[item.itemId || item.id] ? (
                            <span style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>✓ Reviewed</span>
                          ) : (
                            <Button size="sm" variant="accent" onClick={() => handleOpenReview(item, prod)} style={{ fontSize: 11, fontWeight: 700 }}>
                              ✍️ Give Review
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed History Audit Toggle */}
            {timeline?.history && timeline.history.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => toggleHistory(o.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--brand)",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: 0
                  }}
                >
                  <ClipboardList size={15} />
                  <span>{expandedHistory[o.id] ? "Hide Delivery Audit History" : "View Detailed Status Log & Audit History"}</span>
                  {expandedHistory[o.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expandedHistory[o.id] && (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      background: "var(--bg-soft)",
                      padding: "14px 18px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)"
                    }}
                  >
                    {timeline.history.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          paddingBottom: 8,
                          borderBottom: "1px solid var(--border)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700 }}>
                          <span style={{ color: "var(--text)" }}>● {h.status}</span>
                          <span className="fc-soft" style={{ fontSize: 11.5, fontWeight: 500 }}>{formatDate(h.timestamp)}</span>
                        </div>
                        <p className="fc-muted" style={{ margin: "3px 0", fontSize: 12 }}>
                          {h.message || "Delivery status updated."}
                        </p>
                        <span className="fc-soft" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={11} /> {h.location || "EcoMart Logistics Facility"} • Updated by {h.updatedBy || "System"} ({h.updatedByRole})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Post-Delivery Product Review Modal */}
      {reviewModalItem && (
        <Modal
          open={!!reviewModalItem}
          onClose={() => setReviewModalItem(null)}
          title="Product Delivery Review"
        >
          <form onSubmit={handleSubmitReview} style={{ padding: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-soft)", padding: 12, borderRadius: "var(--radius-md)", marginBottom: 16 }}>
              <img
                src={getProductImage(reviewModalItem.product)}
                alt={reviewModalItem.product?.name || "Product"}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
              />
              <div>
                <strong style={{ fontSize: 14, display: "block", color: "var(--text)" }}>
                  {reviewModalItem.product?.name || "Delivered Product"}
                </strong>
                <span className="fc-soft" style={{ fontSize: 12 }}>
                  Verified Delivered Order Item
                </span>
              </div>
            </div>

            {/* Rating Picker */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Rating (1 to 5 Stars) *
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setReviewRating(star)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 24,
                      cursor: "pointer",
                      color: star <= reviewRating ? "#f59e0b" : "#cbd5e1"
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Written Review Text Area */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Written Review Comment *
              </label>
              <textarea
                required
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write your review for this product after delivery..."
                className="fc-input"
                style={{ width: "100%", padding: 10, fontSize: 13, fontFamily: "inherit" }}
              />
            </div>

            {/* Optional Image URL */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Product Image URL (Optional)
              </label>
              <input
                type="text"
                value={reviewImageUrl}
                onChange={(e) => setReviewImageUrl(e.target.value)}
                placeholder="Paste optional product image link..."
                className="fc-input"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
              />
              <span className="fc-soft" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                Adding a picture is optional. Written review is required.
              </span>
            </div>

            {/* Form Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button type="button" variant="outline" onClick={() => setReviewModalItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submittingReview}>
                {submittingReview ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export const OrderTracking = memo(OrderTrackingBase);
export default OrderTracking;

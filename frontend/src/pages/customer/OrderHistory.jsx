import { useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Search as SearchIcon,
  Truck as TruckIcon,
  Check,
  ShoppingBag,
  Star} from "../../components/icons/Icons.jsx";
import {
  Button,
  Card,
  Badge,
  Avatar,
  SearchBox,
  StatCard,
  Skeleton,
  TableRowSkeleton,
  EmptyState,
  Modal} from "../../components/common/index.js";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { useData } from "../../hooks/useData.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { apiFetch } from "../../services/api.js";

const STATUS_FILTERS = [
  "All",
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "In Transit",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const CATEGORY_FALLBACKS = {
  Vegetables: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=products&w=200&q=80",
  Grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=products&w=200&q=80",
  Fruits: "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=products&w=200&q=80",
  Spices: "https://images.unsplash.com/photo-1596790011568-d0f948b8ec66?auto=format&fit=products&w=200&q=80",
  Dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=products&w=200&q=80"};

function getStatusBadgeVariant(status) {
  switch (status) {
    case "Pending":
      return "warning";
    case "Accepted":
    case "Confirmed":
    case "Preparing":
    case "In Transit":
    case "Out for Delivery":
      return "info";
    case "Delivered":
      return "success";
    case "Cancelled":
    case "Rejected":
      return "danger";
    default:
      return "neutral";
  }
}

function OrderHistoryBase() {
  const { t } = useLanguage();
  const { orders, products, loading } = useData();
  const { customerProfile } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal state
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImageUrl, setReviewImageUrl] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedItemIds, setReviewedItemIds] = useState({});

  const myOrders = useMemo(
    () => orders.filter((o) => o.customerName === customerProfile.name || (o.customerId && String(o.customerId) === String(customerProfile.id))),
    [orders, customerProfile]
  );

  const getProduct = useCallback(
    (id) => products.find((p) => p.id === id),
    [products]
  );

  const handleOpenReview = (orderItem, product) => {
    setReviewModalItem({ orderItem, product });
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
      const targetProdId = reviewModalItem.product?.id || reviewModalItem.orderItem.productId;
      const targetVendorId = reviewModalItem.product?.vendorId || reviewModalItem.orderItem.vendorId;

      const res = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: targetProdId,
          vendorId: targetVendorId,
          customerId: customerProfile.id || "u_customer",
          customerName: customerProfile.name || "Verified Customer",
          rating: reviewRating,
          comment: reviewComment.trim(),
          imageUrl: reviewImageUrl.trim() || null
        })
      });

      if (res.ok) {
        notifySuccess("Thank you! Product review submitted successfully.");
        const itemKey = reviewModalItem.orderItem.itemId || reviewModalItem.orderItem.id;
        setReviewedItemIds((prev) => ({ ...prev, [itemKey]: true }));
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

  const filtered = useMemo(() => {
    let result = myOrders;
    if (statusFilter !== "All") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const prod = getProduct(o.productId);
        const prodName = prod?.name?.toLowerCase() || "";
        const orderId = String(o.id).toLowerCase();
        const address = o.deliveryAddress?.toLowerCase() || "";
        return orderId.includes(q) || prodName.includes(q) || address.includes(q);
      });
    }
    return result;
  }, [myOrders, statusFilter, searchQuery, getProduct]);

  const stats = useMemo(() => {
    const totalSpent = myOrders.reduce((s, o) => s + o.amount, 0);
    const deliveredCount = myOrders.filter((o) => o.status === "Delivered").length;
    const activeCount = myOrders.filter(
      (o) => o.status !== "Delivered" && o.status !== "Cancelled"
    ).length;
    return { totalSpent, deliveredCount, activeCount };
  }, [myOrders]);

  const clearSearchAndFilters = () => {
    setStatusFilter("All");
    setSearchQuery("");
  };

  return (
    <div className="fc-page-transition">
      {/* Header */}
      <div className="fc-page-head">
        <div>
          <h1 className="fc-h1">{t("orderHistory")}</h1>
          <p className="fc-muted" style={{ marginTop: 4 }}>
            Track and review your marketplace wholesale procurement orders
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
          <ShoppingBag size={15} /> {t("browseMarketplace")}
        </Button>
      </div>

      {/* Metrics Summary */}
      <div className="fc-stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Procurement Spend"
          value={formatCurrency(stats.totalSpent)}
          icon={<TruckIcon size={20} />}
          color="var(--brand)"
          bg="var(--brand-light)"
        />
        <StatCard
          label="Delivered marketplace Orders"
          value={`${stats.deliveredCount} Orders`}
          icon={<Check size={20} />}
          color="var(--accent)"
          bg="var(--accent-light)"
        />
        <StatCard
          label="Active Shipments"
          value={`${stats.activeCount} In Transit`}
          icon={<ClipboardList size={20} />}
          color="var(--info)"
          bg="var(--info-light)"
        />
      </div>

      {/* Search & Status Filters */}
      <Card style={{ padding: "18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "14px" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <SearchBox
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Search order ID, products, or delivery address..."
            />
          </div>
          <div className="fc-soft" style={{ fontSize: "12.5px", fontWeight: 600 }}>
            Showing {filtered.length} of {myOrders.length} orders
          </div>
        </div>

        {/* Scrollable Status Filter Chips */}
        <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
          <div className="fc-flex-gap-8 fc-flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                className={`fc-radio-chip ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
                style={{ fontSize: "12px", padding: "6px 14px" }}
              >
                {s === "All" ? t("all") : s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders Table Container */}
      <Card style={{ padding: "20px" }}>
        {loading ? (
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead>
                <tr>
                  <th>{t("orderId")}</th>
                  <th>products Lot</th>
                  <th>{t("qty")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("date")}</th>
                  <th>Shipping Address</th>
                  <th>Payment</th>
                  <th>{t("status")}</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={9} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={28} />}
            title="No orders match your search or status filter"
            description="Browse our verified vendor marketplace to place new wholesale orders."
            action={
              <div className="fc-flex-gap-8">
                <Button variant="outline" onClick={clearSearchAndFilters}>
                  Clear Filters
                </Button>
                <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
                  {t("browseMarketplace")}
                </Button>
              </div>
            }
          />
        ) : (
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead>
                <tr>
                  <th>{t("orderId")}</th>
                  <th>products Lot</th>
                  <th>{t("qty")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("date")}</th>
                  <th>Shipping Address</th>
                  <th>Payment</th>
                  <th>{t("status")}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const prod = getProduct(o.productId);
                  const prodImg = prod?.imageUrl || CATEGORY_FALLBACKS[prod?.category] || CATEGORY_FALLBACKS.Vegetables;
                  const badgeVariant = getStatusBadgeVariant(o.status);
                  const itemKey = o.itemId || o.id;
                  const isDelivered = o.status === "Delivered";
                  const isReviewed = reviewedItemIds[itemKey];

                  return (
                    <tr key={itemKey}>
                      <td>
                        <strong style={{ fontFamily: "var(--font-heading)" }}>{o.id}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={prodImg}
                            alt={prod?.name || "products"}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "var(--radius-sm)",
                              objectFit: "cover"}}
                          />
                          <div>
                            <strong style={{ fontSize: 13 }}>{prod?.name || "products Lot"}</strong>
                            <div className="fc-soft" style={{ fontSize: 10.5 }}>
                              Grade {prod?.grade || "A"} • {prod?.category || "products"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{o.qty}</strong> {prod?.unit || "units"}
                      </td>
                      <td>
                        <strong style={{ fontFamily: "var(--font-heading)", color: "var(--brand)" }}>
                          {formatCurrency(o.amount, o.currency)}
                        </strong>
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td
                        style={{
                          fontSize: "12px",
                          maxWidth: "180px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"}}
                        title={o.deliveryAddress || "Standard marketplace Delivery"}
                      >
                        {o.deliveryAddress || "Standard marketplace Delivery"}
                      </td>
                      <td style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: 700 }}>
                        {o.paymentMethod || "COD"}
                      </td>
                      <td>
                        <Badge variant={badgeVariant}>{o.status}</Badge>
                      </td>
                      <td>
                        {isDelivered ? (
                          isReviewed ? (
                            <span style={{ color: "var(--brand)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <Check size={14} /> Review Posted
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="accent"
                              onClick={() => handleOpenReview(o, prod)}
                              style={{ fontWeight: 700, fontSize: 12 }}
                            >
                              ✍️ Give Review
                            </Button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/customer/tracking/${o.id}`)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--brand)",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer",
                              padding: 0
                            }}
                          >
                            Track Delivery →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Modal */}
      {reviewModalItem && (
        <Modal
          open={!!reviewModalItem}
          onClose={() => setReviewModalItem(null)}
          title="Product Delivery Review"
        >
          <form onSubmit={handleSubmitReview} style={{ padding: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-soft)", padding: 12, borderRadius: "var(--radius-md)", marginBottom: 16 }}>
              <img
                src={reviewModalItem.product?.imageUrl || CATEGORY_FALLBACKS[reviewModalItem.product?.category] || CATEGORY_FALLBACKS.Vegetables}
                alt={reviewModalItem.product?.name || "Product"}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
              />
              <div>
                <strong style={{ fontSize: 14, display: "block", color: "var(--text)" }}>
                  {reviewModalItem.product?.name || "Delivered Product"}
                </strong>
                <span className="fc-soft" style={{ fontSize: 12 }}>
                  Order #{reviewModalItem.orderItem.id} • Verified Delivered Purchase
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
                      color: star <= reviewRating ? "#f59e0b" : "#cbd5e1",
                      transition: "transform 0.1s"
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Written Review (Required) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Written Review Comment *
              </label>
              <textarea
                required
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with the product quality, packaging, and delivery..."
                className="fc-input"
                style={{ width: "100%", padding: 10, fontSize: 13, fontFamily: "inherit" }}
              />
            </div>

            {/* Image URL / Upload (Optional) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Product Image URL (Optional)
              </label>
              <input
                type="text"
                value={reviewImageUrl}
                onChange={(e) => setReviewImageUrl(e.target.value)}
                placeholder="Paste optional image link (e.g. https://...)"
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

export const OrderHistory = memo(OrderHistoryBase);
export default OrderHistory;

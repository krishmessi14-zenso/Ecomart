import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate, useParams} from "react-router-dom";
import { Check, Truck as TruckIcon, ClipboardList, X, RefreshCw, AlertTriangle, Calendar, MapPin } from "../../components/icons/Icons.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { Button } from "../../components/common/Button.jsx";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { useData } from "../../hooks/useData.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";

const ALL_STAGES = [
  "Order Placed",
  "Payment Confirmed",
  "Accepted by Vendor",
  "Preparing",
  "Packed",
  "Ready for Pickup",
  "In Transit",
  "Out for Delivery",
  "Delivered"
];

function TrackingTimeline({ order, timelineData }) {
  const currentStatus = timelineData?.currentStatus || order.status || "Order Placed";
  const isCancelled = timelineData?.isCancelled || currentStatus.includes("Cancelled") || currentStatus.includes("Rejected");

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold mt-3">
        <X size={18} />
        <span>Order Status: {currentStatus}</span>
      </div>
    );
  }

  // Find index in ALL_STAGES matching current status
  let currentIdx = ALL_STAGES.findIndex(s => s.toLowerCase() === currentStatus.toLowerCase());
  if (currentIdx === -1) {
    if (currentStatus === "Pending") currentIdx = 0;
    else if (currentStatus === "Accepted") currentIdx = 2;
    else if (currentStatus === "Confirmed") currentIdx = 1;
    else currentIdx = 0;
  }

  return (
    <div className="mt-5">
      {/* Desktop Stepper Bar */}
      <div className="hidden md:flex justify-between relative mb-8 px-2">
        <div className="absolute top-[14px] left-[25px] right-[25px] h-[3px] bg-slate-200 dark:bg-slate-700 z-0" />
        <div
          className="absolute top-[14px] left-[25px] h-[3px] bg-emerald-600 transition-all duration-500 z-0"
          style={{ width: `${(currentIdx / (ALL_STAGES.length - 1)) * 94}%` }}
        />

        {ALL_STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isUpcoming = idx > currentIdx;

          return (
            <div key={stage} className="flex flex-col items-center relative z-10 w-16">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                  isDone
                    ? "bg-emerald-600 border-2 border-emerald-600 text-white shadow-xs"
                    : isActive
                    ? "bg-amber-500 border-2 border-amber-500 text-white shadow-md ring-4 ring-amber-100 dark:ring-amber-950/50"
                    : "bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400"
                }`}
              >
                {isDone ? <Check size={13} /> : isActive ? <RefreshCw size={12} className="animate-spin" /> : <ClipboardList size={11} />}
              </div>
              <span
                className={`text-[10px] mt-2 text-center whitespace-normal leading-tight font-medium ${
                  isActive ? "font-bold text-amber-600 dark:text-amber-400" : isDone ? "text-slate-800 dark:text-slate-200" : "text-slate-400"
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Stage Detail */}
      <div className="bg-emerald-50/70 dark:bg-slate-800/60 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <strong className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            ● Active Delivery Phase: {currentStatus}
          </strong>
          {timelineData?.estimatedDelivery && (
            <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Calendar size={12} /> Expected by: {timelineData.estimatedDelivery}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderTrackingBase() {
  const { t } = useLanguage();
  const { orders, products, refreshData } = useData();
  const { user: currentUser } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [timelines, setTimelines] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});
  const [cancellingId, setCancellingId] = useState(null);

  // Filter orders for current customer
  const customerOrders = useMemo(() => {
    const list = orders.filter(
      (o) => (currentUser?.id && o.customerId === currentUser.id) || (currentUser?.name && o.customerName === currentUser.name)
    );
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

  const getProductName = (prodId) => products.find((p) => p.id === prodId)?.name || "EcoMart Product";

  if (groupedOrders.length === 0) {
    return (
      <div className="fc-page-transition p-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t("orderTracking")}</h1>
        <EmptyState
          icon={<TruckIcon size={32} />}
          title={t("noOrdersYet")}
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
    <div className="fc-page-transition p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("orderTracking")}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time delivery progress, ETA timelines, and zero-waste shipping history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/customer/marketplace")}>
          ← Continue Shopping
        </Button>
      </div>

      {groupedOrders.map((o) => {
        const timeline = timelines[o.id];
        const status = timeline?.currentStatus || o.status || "Order Placed";
        const isEligibleCancel = ["Order Placed", "Payment Confirmed", "Pending"].includes(status);

        return (
          <div
            key={o.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 mb-6"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Order #{o.id}
                  {timeline?.isDelayed && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                      <AlertTriangle size={12} /> Delivery May Be Delayed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Placed on {formatDate(o.createdAt)} • Total: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(o.totalAmount, o.currency)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isEligibleCancel && (
                  <button
                    onClick={() => handleCancelOrder(o.id)}
                    disabled={cancellingId === o.id}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800 transition-all"
                  >
                    {cancellingId === o.id ? "Cancelling..." : "Cancel Order"}
                  </button>
                )}

                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {status}
                </span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <TrackingTimeline order={o} timelineData={timeline} />

            {/* Shipment Items */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Shipment Contents</h4>
              <div className="flex flex-col gap-2">
                {o.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs border border-slate-100 dark:border-slate-800"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      <strong>{getProductName(item.productId)}</strong> × {item.qty} units
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(item.amount, o.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed History Audit Toggle */}
            {timeline?.history && timeline.history.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => toggleHistory(o.id)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  📜 {expandedHistory[o.id] ? "Hide Delivery Audit History" : "View Detailed Status Log & Audit History"}
                </button>

                {expandedHistory[o.id] && (
                  <div className="mt-3 flex flex-col gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    {timeline.history.map((h) => (
                      <div key={h.id} className="flex flex-col border-b border-slate-200 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                          <span>● {h.status}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{formatDate(h.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 mt-0.5">{h.message || "Status updated."}</p>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {h.location || "EcoMart Logistics Facility"} • Updated by {h.updatedBy || "System"} ({h.updatedByRole})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const OrderTracking = memo(OrderTrackingBase);
export default OrderTracking;

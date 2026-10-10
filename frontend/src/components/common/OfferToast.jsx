import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { apiFetch } from "../../services/api.js";
import { Button } from "./Button.jsx";

export default function OfferToast() {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const [toastData, setToastData] = useState(null);

  useEffect(() => {
    // Only execute for logged-in Customers
    if (!isAuthenticated || role !== "customer") return;

    // Check if customer was already notified in this login session
    const sessionNotified = sessionStorage.getItem("ecomart_offer_notified");
    if (sessionNotified === "true") return;

    // Fetch active offers in background (non-blocking)
    apiFetch("/api/offers/active")
      .then((res) => (res.ok ? res.json() : { offers: [] }))
      .then((data) => {
        const activeOffers = data.offers || [];
        if (activeOffers.length === 0) return;

        // Calculate maximum discount percentage among active offers
        const maxDiscount = Math.max(...activeOffers.map((o) => Number(o.discountValue || 0)), 10);

        // Read previously seen offer IDs from localStorage
        let seenOfferIds = [];
        try {
          const stored = localStorage.getItem("ecomart_seen_offer_ids");
          if (stored) seenOfferIds = JSON.parse(stored);
        } catch {
          seenOfferIds = [];
        }

        const newOffers = activeOffers.filter((o) => !seenOfferIds.includes(o.id));
        const allOfferIds = activeOffers.map((o) => o.id);

        let message = "";
        if (newOffers.length > 0) {
          message = `🎉 You have ${activeOffers.length} active offer(s)! Save up to ${maxDiscount}% today.`;
          // Update seen offer IDs in localStorage
          try {
            const updatedSeen = Array.from(new Set([...seenOfferIds, ...allOfferIds]));
            localStorage.setItem("ecomart_seen_offer_ids", JSON.stringify(updatedSeen));
          } catch {
            /* ignore storage errors */
          }
        } else {
          // Shorter message if user has already seen these offers before
          message = `💡 Active offers available! Save up to ${maxDiscount}% today.`;
        }

        // Mark current session as notified
        sessionStorage.setItem("ecomart_offer_notified", "true");

        setToastData({
          message,
          count: activeOffers.length,
          maxDiscount
        });
      })
      .catch((err) => {
        console.warn("Offer toast background check error:", err);
      });
  }, [isAuthenticated, role]);

  if (!toastData) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 99999,
        background: "var(--surface)",
        color: "var(--text)",
        border: "2px solid var(--brand)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 20px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
        maxWidth: "380px",
        width: "calc(100% - 48px)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
        <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--brand)" }}>
          {toastData.message}
        </div>
        <button
          type="button"
          onClick={() => setToastData(null)}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            color: "var(--text-muted)",
            cursor: "pointer",
            lineHeight: 1,
            padding: 0
          }}
          aria-label="Close offer notification"
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setToastData(null)}
          style={{ fontSize: "12px", padding: "4px 10px" }}
        >
          Dismiss
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setToastData(null);
            navigate("/customer/offers");
          }}
          style={{ fontSize: "12px", padding: "4px 12px" }}
        >
          View offers
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../services/api.js";
import { Button } from "../../components/common/Button.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";

export default function OfferApprovals() {
  const [pendingOffers, setPendingOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // Reject Modal State
  const [rejectingOffer, setRejectingOffer] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchPendingOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/offers/admin/pending");
      if (res.ok) {
        const data = await res.json();
        setPendingOffers(data.offers || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to load pending offer approvals.");
      }
    } catch (err) {
      console.error("Admin fetch pending offers error:", err);
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingOffers();
  }, [fetchPendingOffers]);

  const handleApprove = async (offerId, title) => {
    setActionMsg("");
    setError("");
    try {
      const res = await apiFetch(`/api/offers/admin/${offerId}/approve`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`✅ Offer '${title}' approved successfully!`);
        fetchPendingOffers();
      } else {
        setError(data.error || "Failed to approve offer.");
      }
    } catch (err) {
      console.error("Approve offer error:", err);
      setError("Network error while approving offer.");
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason || !rejectionReason.trim()) {
      setRejectError("Rejection reason is required.");
      return;
    }

    setSubmittingAction(true);
    setRejectError("");
    try {
      const res = await apiFetch(`/api/offers/admin/${rejectingOffer.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`🔴 Offer '${rejectingOffer.title}' has been rejected.`);
        setRejectingOffer(null);
        setRejectionReason("");
        fetchPendingOffers();
      } else {
        setRejectError(data.error || "Failed to reject offer.");
      }
    } catch (err) {
      console.error("Reject offer error:", err);
      setRejectError("Network error while rejecting offer.");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) return <LoadingState text="Loading pending offer approvals..." />;

  return (
    <div className="fc-container animate-fade-in" style={{ paddingBottom: "60px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 className="fc-h1" style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>🛡️ Admin Offer Approvals</h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "14px" }}>
          Review and approve promotional offers submitted by EcoMart marketplace vendors.
        </p>
      </div>

      {actionMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "14px", borderRadius: "var(--radius-md)", marginBottom: "20px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          {actionMsg}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", padding: "14px", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {pendingOffers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ margin: 0, fontSize: "15px" }}>🎉 No pending offer approvals requiring review!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", divideY: "1px solid var(--border)" }}>
            {pendingOffers.map((offer) => (
              <div key={offer.id} style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>{offer.title}</h3>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--brand)", fontWeight: 800, padding: "2px 8px", borderRadius: "10px", fontSize: "12px" }}>
                      {offer.discountValue}% OFF
                    </span>
                  </div>
                  {offer.description && <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--text-muted)" }}>{offer.description}</p>}

                  <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span>Vendor ID: <strong>{offer.vendorId}</strong></span>
                    <span>Coupon Code: <strong>{offer.couponCode || "N/A"}</strong></span>
                    <span>Validity: <strong>{new Date(offer.startDate).toLocaleDateString()} – {new Date(offer.endDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <Button variant="primary" onClick={() => handleApprove(offer.id, offer.title)}>
                    ✅ Approve
                  </Button>
                  <Button variant="outline" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => { setRejectingOffer(offer); setRejectionReason(""); setRejectError(""); }}>
                    ❌ Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingOffer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", maxWidth: "460px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: 800 }}>Reject Offer: {rejectingOffer.title}</h3>

            {rejectError && (
              <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", padding: "8px 12px", borderRadius: "6px", marginBottom: "14px", fontSize: "12px" }}>
                ⚠️ {rejectError}
              </div>
            )}

            <form onSubmit={handleRejectSubmit}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>Rejection Reason (Required) *</label>
              <textarea
                className="fc-input"
                placeholder="Explain why this offer is being rejected (e.g. invalid date range, misleading title)..."
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <Button variant="outline" type="button" onClick={() => setRejectingOffer(null)}>
                  Cancel
                </Button>
                <Button variant="danger" type="submit" disabled={submittingAction}>
                  {submittingAction ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

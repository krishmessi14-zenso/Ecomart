import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../services/api.js";
import { Button } from "../../components/common/Button.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";

export default function MyOffers() {
  const [offers, setOffers] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    return {
      title: "",
      description: "",
      discountValue: 15,
      couponCode: "",
      startDate: now.toISOString().slice(0, 10),
      endDate: future.toISOString().slice(0, 10),
      selectedProductIds: []
    };
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [offersRes] = await Promise.all([
        apiFetch("/api/offers/vendor")
      ]);

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(data.offers || []);
      } else {
        const errData = await offersRes.json().catch(() => ({}));
        setError(errData.error || "Failed to load offers.");
      }

      // Fetch vendor products
      const pRes = await apiFetch("/api/products?myProducts=true").catch(() => null);
      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setMyProducts(pData.products || pData || []);
      } else {
        // Fallback fetch all products filtered by vendor
        const allRes = await apiFetch("/api/products");
        if (allRes.ok) {
          const allProds = await allRes.json();
          setMyProducts(Array.isArray(allProds) ? allProds : allProds.products || []);
        }
      }
    } catch (err) {
      console.error("MyOffers fetch error:", err);
      setError("Failed to load offers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckboxToggle = (prodId) => {
    setFormData((prev) => {
      const exists = prev.selectedProductIds.includes(prodId);
      return {
        ...prev,
        selectedProductIds: exists
          ? prev.selectedProductIds.filter((id) => id !== prodId)
          : [...prev.selectedProductIds, prodId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    const discountNum = Number(formData.discountValue);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 90) {
      setFormError("Discount percentage must be between 1% and 90%.");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setFormError("End date must be strictly after Start date.");
      return;
    }

    if (formData.selectedProductIds.length === 0) {
      setFormError("Please select at least one of your products to include in this offer.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/offers/vendor", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: "percentage",
          discountValue: discountNum,
          productIds: formData.selectedProductIds,
          couponCode: formData.couponCode,
          startDate: start.toISOString(),
          endDate: end.toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("🎉 Offer created successfully and sent for Admin Approval!");
        setShowModal(false);
        setFormData({
          title: "",
          description: "",
          discountValue: 15,
          couponCode: "",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          selectedProductIds: []
        });
        fetchData();
      } else {
        setFormError(data.error || "Failed to create offer.");
      }
    } catch (err) {
      console.error("Create offer error:", err);
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status, rejectionReason) => {
    if (status === "approved") {
      return <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "12px" }}>🟢 Approved</span>;
    }
    if (status === "rejected") {
      return (
        <div>
          <span style={{ background: "rgba(220, 38, 38, 0.15)", color: "var(--danger)", padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "12px" }}>🔴 Rejected</span>
          {rejectionReason && <div style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>Reason: {rejectionReason}</div>}
        </div>
      );
    }
    return <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "12px" }}>🟡 Pending Approval</span>;
  };

  if (loading) return <LoadingState text="Loading your vendor offers..." />;

  return (
    <div className="fc-container animate-fade-in" style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="fc-h1" style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>🏷️ My Vendor Offers</h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "14px" }}>
            Create promotional offers and discounts for your catalog products. New offers require Admin approval.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          ➕ Create New Offer
        </Button>
      </div>

      {successMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "14px", borderRadius: "var(--radius-md)", marginBottom: "20px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", padding: "14px", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Offers Table / List */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {offers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ margin: "0 0 16px 0", fontSize: "15px" }}>You have not created any promotional offers yet.</p>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Create Your First Offer
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Offer Title</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Discount</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Coupon Code</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Validity Period</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800 }}>{offer.title}</div>
                      {offer.description && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{offer.description}</div>}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "var(--brand)" }}>
                      {offer.discountValue}% OFF
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <code style={{ background: "var(--bg-soft)", padding: "4px 8px", borderRadius: "4px", fontWeight: 700 }}>
                        {offer.couponCode || "N/A"}
                      </code>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                      {new Date(offer.startDate).toLocaleDateString()} – {new Date(offer.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {getStatusBadge(offer.status, offer.rejectionReason)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Offer Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", maxWidth: "540px", width: "100%", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 800 }}>Create New Product Offer</h3>

            {formError && (
              <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Offer Title *</label>
                <input
                  type="text"
                  className="fc-input"
                  placeholder="e.g., Summer Green Special 20% OFF"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Description</label>
                <textarea
                  className="fc-input"
                  placeholder="Short details about this promotional offer"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Discount % (1-90%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    className="fc-input"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Coupon Code</label>
                  <input
                    type="text"
                    className="fc-input"
                    placeholder="e.g. ECOSAVE20"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Start Date *</label>
                  <input
                    type="date"
                    className="fc-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>End Date *</label>
                  <input
                    type="date"
                    className="fc-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Select Eligible Products from Your Catalog *
                </label>
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", background: "var(--bg-soft)" }}>
                  {myProducts.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No products found in your vendor catalog.</div>
                  ) : (
                    myProducts.map((p) => (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "4px 0", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.selectedProductIds.includes(p.id)}
                          onChange={() => handleCheckboxToggle(p.id)}
                        />
                        <span>{p.name} (₹{p.price})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

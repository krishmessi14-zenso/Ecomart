import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api.js";
import { Button } from "../../components/common/Button.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";

export default function OffersPage() {
  const navigate = useNavigate();
  const [activeOffers, setActiveOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const fetchActiveOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/offers/active");
      if (res.ok) {
        const data = await res.json();
        setActiveOffers(data.offers || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to load active offers.");
      }
    } catch (err) {
      console.error("OffersPage fetch error:", err);
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOffers();
  }, [fetchActiveOffers]);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 3000);
  };

  if (loading) return <LoadingState text="Loading active promotional offers..." />;

  return (
    <div className="fc-container animate-fade-in" style={{ paddingBottom: "60px" }}>
      {/* Hero Banner */}
      <div style={{ background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", color: "#ffffff", padding: "32px 24px", borderRadius: "var(--radius-lg)", marginBottom: "32px", boxShadow: "var(--shadow-md)" }}>
        <h1 className="fc-h1" style={{ margin: 0, fontSize: "28px", fontWeight: 900, color: "#ffffff" }}>
          🌱 Special Eco-Offers & Discounts
        </h1>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: "15px", maxWidth: "600px" }}>
          Save big on plastic-free, organic, and zero-waste sustainable products from verified EcoMart vendors!
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", padding: "14px", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {copiedCode && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "10px 16px", borderRadius: "var(--radius-md)", marginBottom: "20px", fontWeight: 700, fontSize: "14px" }}>
          📋 Coupon code '{copiedCode}' copied to clipboard!
        </div>
      )}

      {/* Offers Grid */}
      {activeOffers.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 800 }}>No Active Offers Right Now</h3>
          <p style={{ margin: "0 0 20px 0" }}>Check back soon for new seasonal discount campaigns and vendor deals!</p>
          <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
            Browse Marketplace
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {activeOffers.map((offer) => (
            <div
              key={offer.id}
              style={{
                background: "var(--surface)",
                border: "2px solid var(--brand)",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ background: "var(--brand)", color: "#ffffff", fontWeight: 900, fontSize: "18px", padding: "6px 14px", borderRadius: "16px" }}>
                    {offer.discountValue}% OFF
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>
                    Valid until {new Date(offer.endDate).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 800 }}>{offer.title}</h3>
                {offer.description && <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.4 }}>{offer.description}</p>}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Coupon Code</div>
                  <code style={{ fontSize: "15px", fontWeight: 900, color: "var(--brand)", letterSpacing: "0.05em" }}>
                    {offer.couponCode || "ECODEAL"}
                  </code>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Button variant="outline" onClick={() => handleCopyCode(offer.couponCode)}>
                    Copy Code
                  </Button>
                  <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
                    Shop Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

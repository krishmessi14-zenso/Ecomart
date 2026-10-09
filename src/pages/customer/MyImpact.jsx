import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/common/Button.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";

const LeafIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7 0 4.9-4 9-9 9z" />
    <path d="M11 20v-7" />
  </svg>
);

const ScanIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </svg>
);

export default function MyImpact() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/scan/my-impact")
      .then((res) => (res.ok ? res.json() : Promise.reject("Failed to load impact data")))
      .then((data) => {
        if (mounted) {
          setImpactData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Impact dashboard error:", err);
          setError("Failed to load impact dashboard data.");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="fc-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>🔒 Login Required</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>Please log in to view your Eco-Impact Dashboard.</p>
        <Button variant="primary" onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }

  if (loading) {
    return <LoadingState text="Loading your Eco-Impact Dashboard..." />;
  }

  const timeline = impactData?.timeline || [];
  const maxPlasticKg = Math.max(...timeline.map((t) => t.plasticKg), 0.1);

  return (
    <div className="fc-container animate-fade-in" style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ background: "var(--brand)", color: "#fff", padding: "8px", borderRadius: "10px", display: "flex" }}>
              <LeafIcon size={24} />
            </div>
            <h1 className="fc-h1" style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>My Eco-Impact Dashboard</h1>
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>
            Track your total plastic savings, carbon footprint offset, Green Points balance, and environmental progress over time.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate("/customer/scan")}>
          <ScanIcon size={16} style={{ marginRight: 6 }} /> Scan Product
        </Button>
      </div>

      {error && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", padding: "14px", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Impact Stat Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-xs)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Plastic Saved</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--brand)", marginTop: "8px" }}>
            {impactData?.plasticSavedKg || 0} <span style={{ fontSize: "16px", fontWeight: 700 }}>kg</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Equivalent to ~{Math.round((impactData?.plasticSavedGrams || 0) / 15)} single-use bottles
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-xs)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>CO₂ Footprint Offset</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--warning)", marginTop: "8px" }}>
            {impactData?.co2SavedKg || 0} <span style={{ fontSize: "16px", fontWeight: 700 }}>kg CO₂</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            ~{impactData?.treesEquivalent || 0} trees seedling equivalent
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-xs)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Green Points Balance</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#10b981", marginTop: "8px" }}>
            💎 {impactData?.greenPoints || 0}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Redeemable for discount coupons
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-xs)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Scans & Eco-Swaps</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--text)", marginTop: "8px" }}>
            {impactData?.totalScansCount || 0} <span style={{ fontSize: "16px", fontWeight: 700 }}>items</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Across {impactData?.totalOrdersCount || 0} orders & scans
          </div>
        </div>
      </div>

      {/* Small Chart Over Time */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", marginBottom: "32px", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Plastic Savings Over Time</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>Monthly progression of cumulative plastic eliminated (kg)</p>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, background: "rgba(5, 150, 105, 0.1)", color: "var(--brand)", padding: "4px 10px", borderRadius: "12px" }}>
            6 Month Trend
          </span>
        </div>

        {/* Small SVG / CSS Bar Chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "180px", paddingTop: "20px", paddingBottom: "24px", borderBottom: "1px solid var(--border)" }}>
          {timeline.map((item, idx) => {
            const heightPercent = Math.max(12, Math.round((item.plasticKg / maxPlasticKg) * 100));
            return (
              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand)", marginBottom: "6px" }}>
                  {item.plasticKg}kg
                </div>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "36px",
                    height: `${heightPercent}%`,
                    background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
                    borderRadius: "6px 6px 0 0",
                    transition: "height 0.3s ease"
                  }}
                  title={`${item.month}: ${item.plasticKg}kg plastic saved, ${item.co2Kg}kg CO₂ offset`}
                />
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginTop: "8px" }}>
                  {item.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scan & Eco History List */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 800 }}>Recent Eco-Scans & Swaps</h3>

        {impactData?.history && impactData.history.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {impactData.history.map((scan) => (
              <div
                key={scan.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: "var(--bg-soft)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "15px" }}>{scan.detectedProduct || "Scanned Item"}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Category: {scan.category || "General"} • {scan.scannedAt ? new Date(scan.scannedAt).toLocaleDateString() : "Recently"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--brand)", background: "rgba(5, 150, 105, 0.1)", padding: "4px 10px", borderRadius: "12px" }}>
                    🌱 Eco Swapped
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#10b981" }}>
                    +50 Points
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text-muted)" }}>
            <p style={{ margin: "0 0 16px 0" }}>You have not completed any product scans yet.</p>
            <Button variant="primary" onClick={() => navigate("/customer/scan")}>
              Scan Your First Product
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

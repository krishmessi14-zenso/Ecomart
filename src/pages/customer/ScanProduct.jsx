import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/common/Button.jsx";

const ScanIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </svg>
);

const CheckIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LeafIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7 0 4.9-4 9-9 9z" />
    <path d="M11 20v-7" />
  </svg>
);

export default function ScanProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [chosenAlternativeId, setChosenAlternativeId] = useState(null);
  const [impactReward, setImpactReward] = useState(null);

  // Validate File Type & Size (Max 5MB)
  const handleFileChange = (file) => {
    setErrorMsg("");
    setScanResult(null);
    setImpactReward(null);

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Invalid file type. Please upload a JPEG, PNG, or WEBP image.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMsg("File size exceeds 5MB limit. Please select a smaller image file.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Submit scan to backend POST /api/scan
  const handleScanSubmit = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select an image file to scan.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg("");
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await apiFetch("/api/scan", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to complete product eco scan.");
      }
    } catch (err) {
      console.error("Scan error:", err);
      if (err.message === "Failed to fetch" || (err.message && err.message.includes("Failed to fetch"))) {
        setErrorMsg("Cannot reach the server. Make sure the backend is running.");
      } else {
        setErrorMsg(err.message || "An error occurred while scanning. Please check your image and try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Choose Alternative & Award Green Points
  const handleChooseAlternative = async (altProduct) => {
    if (!scanResult) return;
    setChosenAlternativeId(altProduct.id);

    try {
      const payload = {
        scanId: scanResult.scanId,
        chosenProductId: altProduct.id,
        plasticSavedGrams: scanResult.estimatedPlasticWeightGrams,
        co2SavedKg: scanResult.estimatedCo2Kg,
        productName: scanResult.productName
      };

      const res = await apiFetch("/api/scan/choose-alternative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setImpactReward(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to record your eco choice.");
      }
    } catch (err) {
      console.error("Choose alternative error:", err);
      setErrorMsg(err.message || "Failed to process eco choice.");
    }
  };

  if (!user) {
    return (
      <div className="fc-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>🔒 Login Required</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>Please log in to your customer account to use the Eco-Impact Scanner and earn Green Points.</p>
        <Button variant="primary" onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="fc-container animate-fade-in" style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ background: "var(--brand)", color: "#fff", padding: "8px", borderRadius: "10px", display: "flex" }}>
              <ScanIcon size={24} />
            </div>
            <h1 className="fc-h1" style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Eco-Impact Scanner</h1>
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>
            Upload a picture of any product to analyze its plastic content, calculate carbon footprint, and find sustainable plastic-free alternatives!
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/customer/impact")}>
          <LeafIcon size={16} style={{ marginRight: 6 }} /> My Impact Dashboard
        </Button>
      </div>

      {/* Validation Error Banner */}
      {errorMsg && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "14px 18px", borderRadius: "var(--radius-md)", marginBottom: "24px", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Reward Celebration Banner */}
      {impactReward && (
        <div style={{ background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", color: "#fff", padding: "20px 24px", borderRadius: "var(--radius-lg)", marginBottom: "28px", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "28px" }}>🎉</span>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>{impactReward.message}</h3>
          </div>
          <p style={{ margin: "0 0 16px 0", opacity: 0.9, fontSize: "14px" }}>
            You eliminated <strong>{impactReward.plasticSavedGrams}g of plastic</strong> and offset <strong>{impactReward.co2SavedKg}kg of CO₂</strong>!
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" onClick={() => navigate("/customer/impact")}>
              View My Impact & Points ({impactReward.newGreenPointsBalance} pts)
            </Button>
            <Button variant="outline" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }} onClick={() => { setSelectedFile(null); setPreviewUrl(null); setScanResult(null); setImpactReward(null); }}>
              Scan Another Item
            </Button>
          </div>
        </div>
      )}

      {/* Main Upload Box */}
      {!scanResult && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "40px 20px",
            textAlign: "center",
            background: "var(--surface)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginBottom: "24px"
          }}
        >
          {previewUrl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <img src={previewUrl} alt="Product Preview" style={{ maxHeight: "240px", borderRadius: "var(--radius-md)", objectFit: "contain", border: "1px solid var(--border)" }} />
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Selected file: <strong>{selectedFile?.name}</strong> ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <Button variant="primary" disabled={isAnalyzing} onClick={handleScanSubmit}>
                  {isAnalyzing ? "Analyzing with Gemini Vision AI..." : "🔍 Scan & Analyze Product"}
                </Button>
                <Button variant="outline" disabled={isAnalyzing} onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>
                  Change Image
                </Button>
              </div>
            </div>
          ) : (
            <label style={{ cursor: "pointer", display: "block" }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileChange(e.target.files[0])} style={{ display: "none" }} />
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-soft)", margin: "0 auto 16px auto", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)" }}>
                <ScanIcon size={32} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 700 }}>Upload or Drag Product Photo</h3>
              <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "14px" }}>
                Supports JPG, PNG, WEBP (Max size: 5MB)
              </p>
              <span className="fc-btn fc-btn-secondary" style={{ display: "inline-block" }}>
                Browse Image File
              </span>
            </label>
          )}
        </div>
      )}

      {/* Scan Results & Top 3 Alternatives */}
      {scanResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Analysis Card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Detected Product
                </span>
                <h2 style={{ margin: "4px 0 0 0", fontSize: "20px", fontWeight: 800 }}>{scanResult.productName}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setScanResult(null); setSelectedFile(null); setPreviewUrl(null); }}>
                Scan New Item
              </Button>
            </div>

            {/* Impact Metric Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "var(--bg-soft)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>ESTIMATED PLASTIC</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--danger)", marginTop: "4px" }}>
                  {scanResult.estimatedPlasticWeightGrams} g
                </div>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>CARBON FOOTPRINT</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--warning)", marginTop: "4px" }}>
                  {scanResult.estimatedCo2Kg} kg CO₂
                </div>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>MATERIAL TYPE</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", marginTop: "8px" }}>
                  {scanResult.material}
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(5, 150, 105, 0.08)", border: "1px solid rgba(5, 150, 105, 0.2)", padding: "14px 16px", borderRadius: "var(--radius-md)" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--brand)" }}>💡 AI Environmental Analysis:</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: 1.5, color: "var(--text)" }}>{scanResult.sustainabilitySummary}</p>
            </div>
          </div>

          {/* Top 3 Plastic-Free Database Alternatives */}
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <LeafIcon size={20} style={{ color: "var(--brand)" }} /> Recommended Plastic-Free Alternatives from EcoMart
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
              {scanResult.alternatives && scanResult.alternatives.length > 0 ? (
                scanResult.alternatives.map((alt) => {
                  const isChosen = chosenAlternativeId === alt.id;
                  return (
                    <div
                      key={alt.id}
                      style={{
                        background: "var(--surface)",
                        border: isChosen ? "2px solid var(--brand)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: isChosen ? "var(--shadow-md)" : "var(--shadow-xs)"
                      }}
                    >
                      <div>
                        <div style={{ position: "relative", width: "100%", height: "160px", marginBottom: "14px", overflow: "hidden", borderRadius: "var(--radius-md)", background: "var(--bg-soft)" }}>
                          <img src={alt.imageUrl} alt={alt.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", top: 8, right: 8, background: "var(--brand)", color: "#fff", fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "12px" }}>
                            EcoScore: {alt.ecoScore}/100
                          </div>
                        </div>

                        <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 800 }}>{alt.name}</h4>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--brand)", marginBottom: "10px" }}>
                          ₹{alt.price}
                        </div>

                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.4 }}>
                          🌱 Eliminates {scanResult.estimatedPlasticWeightGrams}g plastic & offsets {scanResult.estimatedCo2Kg}kg CO₂!
                        </div>
                      </div>

                      <Button
                        variant={isChosen ? "success" : "primary"}
                        disabled={!!impactReward}
                        onClick={() => handleChooseAlternative(alt)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        {isChosen ? (
                          <>
                            <CheckIcon size={16} style={{ marginRight: 6 }} /> Alternative Chosen!
                          </>
                        ) : (
                          "Choose Alternative & Earn Green Points"
                        )}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: "1 / -1", padding: "20px", textStyle: "center", color: "var(--text-muted)" }}>
                  No alternative products found in database.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

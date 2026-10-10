import { useState, useCallback, memo } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { LANGUAGES } from "../../context/LanguageContext.jsx";
import { useNotifications } from "../../hooks/useNotifications.js";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { reverseGeocodeLocation } from "../../services/locationService.js";
import {
  Check,
  User,
  Store,
  MapPin,
  Edit,
  X,
  Globe,
  CreditCard,
  CheckCircle,
  Lock,
  Loader
} from "../../components/icons/Icons.jsx";
import { ChangePassword } from "../../components/profile/ChangePassword.jsx";

// GPS Location Icon Component
const LocateIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CURRENCIES = [
  { code: "INR", label: "INR (₹) - Indian Rupee" },
  { code: "USD", label: "USD ($) - US Dollar" },
  { code: "EUR", label: "EUR (€) - Euro" },
  { code: "GBP", label: "GBP (£) - British Pound" },
  { code: "AUD", label: "AUD (A$) - Australian Dollar" },
];

function ProfileSettingsBase() {
  const { user, updateProfile } = useAuth();
  const { lang, setLang, LANGUAGES: contextLanguages } = useLanguage();
  const availableLanguages = LANGUAGES || contextLanguages || [];
  const { notifySuccess, notifyError } = useNotifications();

  // Active View Tab: 'identity' | 'location' | 'preferences' | 'security' | 'business' | 'payout'
  const [activeTab, setActiveTab] = useState("identity");

  // Edit Mode Toggle
  const [isEditing, setIsEditing] = useState(false);
  const [locating, setLocating] = useState(false);

  // Identity State
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [about, setAbout] = useState(user?.about || "");

  // Location State
  const [countryName, setCountryName] = useState(user?.countryName || "India");
  const [countryCode, setCountryCode] = useState(user?.countryCode || "IN");
  const [region, setRegion] = useState(user?.region || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [city, setCity] = useState(user?.city || "");
  const [postalCode, setPostalCode] = useState(user?.postalCode || "");
  const [address, setAddress] = useState(user?.address || user?.formattedAddress || "");
  const [lat, setLat] = useState(user?.lat || null);
  const [lng, setLng] = useState(user?.lng || null);

  // Preferences State
  const [currency, setCurrency] = useState(user?.currency || "INR");

  // Vendor Payout Details State
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [accountHolderName, setAccountHolderName] = useState(user?.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(user?.ifscCode || "");
  const [panNumber, setPanNumber] = useState(user?.panNumber || "");
  const [gstin, setGstin] = useState(user?.gstin || "");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Handle Location Auto-Detect via Browser Geolocation API & Reverse Geocoding
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      notifyError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geo = await reverseGeocodeLocation(latitude, longitude);
          if (geo) {
            setCountryName(geo.countryName || "India");
            setCountryCode(geo.countryCode || "IN");
            setRegion(geo.regionName || "");
            setDistrict(geo.districtName || "");
            setCity(geo.placeName || "");
            if (geo.formattedAddress) {
              setAddress(geo.formattedAddress);
            }
            setLat(latitude);
            setLng(longitude);
            notifySuccess(`📍 Location detected: ${geo.placeName || geo.districtName || ""}, ${geo.regionName || ""}, ${geo.countryName || ""}`);
          } else {
            notifyError("Could not retrieve address details for detected coordinates.");
          }
        } catch (err) {
          notifyError("Failed to detect location: " + err.message);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        notifyError(`Location permission error (${err.code}): ${err.message}. Please enter details manually.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [notifySuccess, notifyError]);

  // Cancel edits and reset state to current user prop values
  const handleCancel = useCallback(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setStoreName(user?.storeName || "");
    setAbout(user?.about || "");
    setCountryName(user?.countryName || "India");
    setCountryCode(user?.countryCode || "IN");
    setRegion(user?.region || "");
    setDistrict(user?.district || "");
    setCity(user?.city || "");
    setPostalCode(user?.postalCode || "");
    setAddress(user?.address || user?.formattedAddress || "");
    setCurrency(user?.currency || "INR");
    setUpiId(user?.upiId || "");
    setAccountHolderName(user?.accountHolderName || "");
    setAccountNumber(user?.accountNumber || "");
    setIfscCode(user?.ifscCode || "");
    setPanNumber(user?.panNumber || "");
    setGstin(user?.gstin || "");
    setErrors({});
    setIsEditing(false);
  }, [user]);

  // Submit updated details
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = {};

      if (activeTab === "identity" && !name.trim()) {
        validationErrors.name = "Full name is required.";
      }
      if (activeTab === "business" && user?.role === "vendor" && !storeName.trim()) {
        validationErrors.storeName = "Store name is required.";
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setSubmitting(true);

      const payload = {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        countryName: countryName.trim(),
        countryCode: countryCode.trim(),
        region: region ? region.trim() : null,
        district: district ? district.trim() : null,
        city: city ? city.trim() : null,
        postalCode: postalCode ? postalCode.trim() : null,
        address: address ? address.trim() : null,
        formattedAddress: address ? address.trim() : null,
        lat: lat || null,
        lng: lng || null,
        currency,
        upiId: upiId ? upiId.trim() : null,
        accountHolderName: accountHolderName ? accountHolderName.trim() : null,
        accountNumber: accountNumber ? accountNumber.trim() : null,
        ifscCode: ifscCode ? ifscCode.trim() : null,
        panNumber: panNumber ? panNumber.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        ...(user?.role === "vendor"
          ? {
              storeName: storeName.trim(),
              about: about ? about.trim() : null,
            }
          : {
              about: about ? about.trim() : null,
            }),
      };

      try {
        if (!user?.id) throw new Error("No authenticated user profile found.");
        await updateProfile(user.id, payload);
        notifySuccess("Profile updated successfully!");
        setIsEditing(false);
      } catch (err) {
        notifyError(err.message || "Failed to update profile.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      activeTab, name, phone, storeName, about, countryName, countryCode,
      region, district, city, postalCode, address, lat, lng, currency,
      upiId, accountHolderName, accountNumber, ifscCode, panNumber, gstin,
      user, updateProfile, notifySuccess, notifyError
    ]
  );

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "U";
  const roleLabel =
    user?.role === "admin"
      ? "Platform Administrator"
      : user?.role === "vendor"
      ? "Verified Seller / Vendor"
      : "Verified Buyer / Customer";

  return (
    <div className="fc-page-transition" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Premium Hero Banner Header */}
      <div
        style={{
          borderRadius: "28px",
          background: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)",
          padding: "36px 32px 32px 32px",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(4, 120, 87, 0.25)",
          marginBottom: "28px",
          border: "1px solid rgba(52, 211, 153, 0.3)",
        }}
      >
        {/* Glow Accent Circle */}
        <div
          style={{
            position: "absolute",
            top: "-40%",
            right: "-10%",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          {/* Avatar & User Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <div
              style={{
                width: "82px",
                height: "82px",
                borderRadius: "26px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
                fontWeight: 900,
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(255, 255, 255, 0.25)",
                letterSpacing: "-0.03em",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                  {user?.name || "EcoMart User"}
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: "999px",
                    background: "rgba(16, 185, 129, 0.3)",
                    border: "1px solid rgba(52, 211, 153, 0.4)",
                    color: "#a7f3d0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {roleLabel}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(8px)",
                    color: "#6ee7b7",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle size={12} /> Verified Profile
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span>✉️ {user?.email}</span>
                {user?.storeName && <span>• 🏪 {user.storeName}</span>}
                {user?.city && <span>• 📍 {user.city}, {user.countryName || "India"}</span>}
              </p>
            </div>
          </div>

          {/* Edit / Cancel Toggle Button */}
          {activeTab !== "security" && (
            <div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(12px)",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.25s ease",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.2)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                >
                  <Edit size={16} /> Edit Section
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    background: "rgba(239, 68, 68, 0.2)",
                    backdropFilter: "blur(12px)",
                    color: "#fca5a5",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.25s ease",
                  }}
                >
                  <X size={16} /> Cancel Editing
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Sub-Navigation Bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            overflowX: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            style={{
              padding: "9px 18px",
              borderRadius: "12px",
              border: "none",
              background: activeTab === "identity" ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
              color: activeTab === "identity" ? "#064e3b" : "#e2e8f0",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
              boxShadow: activeTab === "identity" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            <User size={15} /> Overview & Identity
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("location")}
            style={{
              padding: "9px 18px",
              borderRadius: "12px",
              border: "none",
              background: activeTab === "location" ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
              color: activeTab === "location" ? "#064e3b" : "#e2e8f0",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
              boxShadow: activeTab === "location" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            <MapPin size={15} /> Registered Address
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            style={{
              padding: "9px 18px",
              borderRadius: "12px",
              border: "none",
              background: activeTab === "preferences" ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
              color: activeTab === "preferences" ? "#064e3b" : "#e2e8f0",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
              boxShadow: activeTab === "preferences" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            <Globe size={15} /> Regional & Currency
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("security");
              setIsEditing(false);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: "12px",
              border: "none",
              background: activeTab === "security" ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
              color: activeTab === "security" ? "#064e3b" : "#e2e8f0",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
              boxShadow: activeTab === "security" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            <Lock size={15} /> Security & Password
          </button>

          {user?.role === "vendor" && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("business")}
                style={{
                  padding: "9px 18px",
                  borderRadius: "12px",
                  border: "none",
                  background: activeTab === "business" ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
                  color: activeTab === "business" ? "#064e3b" : "#e2e8f0",
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                  boxShadow: activeTab === "business" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <Store size={15} /> Vendor Business Info
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payout")}
                style={{
                  padding: "9px 18px",
                  borderRadius: "12px",
                  border: "none",
                  background: activeTab === "payout" ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
                  color: activeTab === "payout" ? "#064e3b" : "#e2e8f0",
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                  boxShadow: activeTab === "payout" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <CreditCard size={15} /> UPI & Payout Settings
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!isEditing ? (
        /* VIEW MODE */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* TAB 1: OVERVIEW & IDENTITY */}
          {activeTab === "identity" && (
            <div
              className="fc-slide-up"
              style={{
                background: "var(--surface)",
                borderRadius: "22px",
                padding: "28px 30px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    Overview & Personal Identity
                  </h3>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} style={{ borderRadius: 10 }}>
                  <Edit size={14} style={{ marginRight: 6 }} /> Edit Identity
                </Button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 20,
                  marginBottom: user?.about ? 20 : 0,
                }}
              >
                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Full Name
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.name || "Not provided"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Registered Email Address (Primary ID)
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.email || "Not provided"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Contact Phone Number
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.phone || "Not specified"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Account Role
                  </span>
                  <strong style={{ color: "var(--brand)", fontSize: 15 }}>{roleLabel}</strong>
                </div>
              </div>

              {user?.about && (
                <div style={{ background: "var(--bg-soft)", padding: "18px 22px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    About / Bio
                  </span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>{user.about}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTERED ADDRESS & LOCATION */}
          {activeTab === "location" && (
            <div
              className="fc-slide-up"
              style={{
                background: "var(--surface)",
                borderRadius: "22px",
                padding: "28px 30px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                      Registered Address & Location Details
                    </h3>
                    <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Used for delivery calculation and regional farmer matching</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "12px",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "var(--brand)",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: locating ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {locating ? <Loader size={14} /> : <LocateIcon size={15} />}
                    {locating ? "Detecting GPS..." : "📍 Detect My Location"}
                  </button>

                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} style={{ borderRadius: 10 }}>
                    <Edit size={14} style={{ marginRight: 6 }} /> Edit Address
                  </Button>
                </div>
              </div>

              {/* Full Formatted Address Card if present */}
              {user?.address && (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "16px 20px", borderRadius: "16px", border: "1px solid rgba(52, 211, 153, 0.3)", marginBottom: 20 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--brand)", display: "block", marginBottom: 4 }}>
                    Full Street Address
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.5 }}>{user.address}</strong>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 20,
                }}
              >
                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Country
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>
                    {user?.countryName || "India"} ({user?.countryCode || "IN"})
                  </strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    State / Region
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.region || "Not specified"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    District
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.district || "Not specified"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    City / Village
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.city || "Not specified"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Postal Code / Pincode
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.postalCode || "Not specified"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGIONAL & CURRENCY */}
          {activeTab === "preferences" && (
            <div
              className="fc-slide-up"
              style={{
                background: "var(--surface)",
                borderRadius: "22px",
                padding: "28px 30px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Globe size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    Regional & Currency Preferences
                  </h3>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} style={{ borderRadius: 10 }}>
                  <Edit size={14} style={{ marginRight: 6 }} /> Edit Preferences
                </Button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                <div style={{ background: "var(--bg-soft)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Default Marketplace Currency
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>
                    {CURRENCIES.find((c) => c.code === (user?.currency || currency))?.label || (user?.currency || "INR")}
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                    All product catalog prices, cart totals, and checkout calculations operate using this standard.
                  </p>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Preferred Display Language
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    {availableLanguages.find((l) => l.code === lang)?.label || "English"}
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                    Interface text, notifications, and navigation labels render in your selected language.
                  </p>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Primary Region
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    {user?.countryName || "India"}
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                    Regional shipping calculations and direct local vendor matching.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & PASSWORD */}
          {activeTab === "security" && (
            <div className="fc-slide-up">
              <ChangePassword />
            </div>
          )}

          {/* VENDOR BUSINESS TAB */}
          {user?.role === "vendor" && activeTab === "business" && (
            <div
              className="fc-slide-up"
              style={{
                background: "var(--surface)",
                borderRadius: "22px",
                padding: "28px 30px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Store size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    Vendor Business Credentials
                  </h3>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} style={{ borderRadius: 10 }}>
                  <Edit size={14} style={{ marginRight: 6 }} /> Edit Business Info
                </Button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 20,
                  marginBottom: user?.about ? 20 : 0,
                }}
              >
                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Store / Business Name
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.storeName || "Not provided"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Vendor Audit Status
                  </span>
                  <strong style={{ color: "var(--brand)", fontSize: 15 }}>{user?.verificationStatus || "Audited & Active"}</strong>
                </div>
              </div>

              {user?.about && (
                <div style={{ background: "var(--bg-soft)", padding: "18px 22px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Store Description & Sustainability Practices
                  </span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>{user.about}</p>
                </div>
              )}
            </div>
          )}

          {/* VENDOR PAYOUT TAB */}
          {user?.role === "vendor" && activeTab === "payout" && (
            <div
              className="fc-slide-up"
              style={{
                background: "var(--surface)",
                borderRadius: "22px",
                padding: "28px 30px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CreditCard size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    Razorpay UPI & Vendor Payout Banking Settings
                  </h3>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} style={{ borderRadius: 10 }}>
                  <Edit size={14} style={{ marginRight: 6 }} /> Edit Payout Details
                </Button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 20,
                }}
              >
                <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "16px 20px", borderRadius: "16px", border: "1px solid rgba(52, 211, 153, 0.3)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--brand)", display: "block", marginBottom: 4 }}>
                    Vendor UPI VPA (Primary Payout Target)
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.upiId || "Not configured"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Bank Account Holder Name
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.accountHolderName || "Not provided"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Bank Account Number
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>
                    {user?.accountNumber ? `•••• •••• ${user.accountNumber.slice(-4)}` : "Not provided"}
                  </strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    Bank IFSC Code
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>{user?.ifscCode || "Not provided"}</strong>
                </div>

                <div style={{ background: "var(--bg-soft)", padding: "16px 20px", borderRadius: "16px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                    PAN / GSTIN
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 15 }}>
                    {user?.panNumber || "PAN: N/A"} {user?.gstin ? `| GST: ${user.gstin}` : ""}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* EDIT MODE: TAB-ISOLATED EDIT FORM */
        <form
          onSubmit={handleSubmit}
          className="fc-slide-up"
          style={{
            background: "var(--surface)",
            borderRadius: "24px",
            padding: "36px 32px",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                Edit {activeTab === "identity" ? "Overview & Identity" : activeTab === "location" ? "Registered Address & Location" : activeTab === "preferences" ? "Regional & Currency Preferences" : activeTab === "business" ? "Vendor Business Info" : "Payout Details"}
              </h3>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Modify details for your selected profile tab section</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: "8px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-soft)",
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "8px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Check size={15} /> {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* EDIT FORM TAB 1: IDENTITY */}
          {activeTab === "identity" && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <User size={16} /> Identity & Profile Information
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                <FormField label="Full Name" error={errors.name}>
                  <input
                    className={`fc-input ${errors.name ? "fc-input-error" : ""}`}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                    required
                  />
                </FormField>

                <FormField label="Registered Email Address (Primary ID)">
                  <input
                    className="fc-input"
                    type="email"
                    value={email}
                    disabled
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16, background: "var(--bg-soft)", color: "var(--text-muted)", cursor: "not-allowed" }}
                  />
                </FormField>

                <FormField label="Contact Phone Number">
                  <input
                    className="fc-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>
              </div>

              <div style={{ marginTop: 16 }}>
                <FormField label="About / Bio">
                  <textarea
                    className="fc-input"
                    rows={3}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Tell us about yourself or your eco-conscious interests..."
                    style={{ width: "100%", borderRadius: "14px", padding: "14px 16px", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* EDIT FORM TAB 2: LOCATION & ADDRESS */}
          {activeTab === "location" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={16} /> Registered Location & Delivery Address
                </h4>

                {/* DETECT LOCATION BUTTON */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locating}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "12px",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)",
                    color: "var(--brand)",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: locating ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {locating ? <Loader size={15} /> : <LocateIcon size={16} />}
                  {locating ? "Detecting GPS Position..." : "📍 Detect My Current Location"}
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <FormField label="Full Street Address / Landmark">
                  <input
                    className="fc-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42 Green Avenue, Gandhi Nagar"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <FormField label="City / Village">
                  <input
                    className="fc-input"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pollachi"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="District">
                  <input
                    className="fc-input"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Coimbatore"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="State / Region">
                  <input
                    className="fc-input"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Tamil Nadu"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="Postal Code / Pincode">
                  <input
                    className="fc-input"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 641001"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="Country Name">
                  <input
                    className="fc-input"
                    type="text"
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    placeholder="e.g. India"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="Country Code">
                  <input
                    className="fc-input"
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                    placeholder="e.g. IN"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* EDIT FORM TAB 3: PREFERENCES & CURRENCY */}
          {activeTab === "preferences" && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <Globe size={16} /> Regional & Language Preferences
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                <FormField label="Preferred Marketplace Currency">
                  <select
                    className="fc-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Interface Display Language">
                  <select
                    className="fc-select"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  >
                    {availableLanguages.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {/* EDIT FORM TAB VENDOR BUSINESS */}
          {user?.role === "vendor" && activeTab === "business" && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <Store size={16} /> Vendor Business Information
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                <FormField label="Store / Business Name" error={errors.storeName}>
                  <input
                    className={`fc-input ${errors.storeName ? "fc-input-error" : ""}`}
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Green Harvest Organic Store"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                    required
                  />
                </FormField>
              </div>

              <div style={{ marginTop: 16 }}>
                <FormField label="Store Description & Eco Practices">
                  <textarea
                    className="fc-input"
                    rows={4}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Describe your organic products, eco-friendly packaging, or sustainability mission..."
                    style={{ width: "100%", borderRadius: "14px", padding: "14px 16px", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* EDIT FORM TAB VENDOR PAYOUT */}
          {user?.role === "vendor" && activeTab === "payout" && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--brand)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <CreditCard size={16} /> Razorpay UPI & Direct Banking Credentials
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                <FormField label="Vendor UPI ID / VPA (Primary Payout Target)">
                  <input
                    className="fc-input"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. vendorname@upi or 9876543210@paytm"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="Account Holder Name (As per Bank)">
                  <input
                    className="fc-input"
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="e.g. Green Harvest Agri Pvt Ltd"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="Bank Account Number">
                  <input
                    className="fc-input"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 9182374650123"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="Bank IFSC Code">
                  <input
                    className="fc-input"
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="PAN Number (KYC)">
                  <input
                    className="fc-input"
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>

                <FormField label="GSTIN Number (Optional)">
                  <input
                    className="fc-input"
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 33ABCDE1234F1Z5"
                    style={{ height: 48, borderRadius: "14px", fontSize: 14, paddingLeft: 16 }}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <Button type="button" variant="secondary" onClick={handleCancel} style={{ borderRadius: "14px", padding: "12px 24px" }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} style={{ borderRadius: "14px", padding: "12px 28px", fontWeight: 800, background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}>
              <Check size={16} style={{ marginRight: 6 }} />
              {submitting ? "Saving Changes..." : "Save Section Changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export const ProfileSettings = memo(ProfileSettingsBase);
export default ProfileSettings;

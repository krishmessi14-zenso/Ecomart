import { useState, useCallback, memo } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Check, User, Store, MapPin, Edit, X } from "../../components/icons/Icons.jsx";

const CURRENCIES = [
  { code: "INR", label: "INR (₹) - Indian Rupee" },
  { code: "USD", label: "USD ($) - US Dollar" },
  { code: "EUR", label: "EUR (€) - Euro" },
  { code: "GBP", label: "GBP (£) - British Pound" },
];

function ProfileSettingsBase() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useNotifications();

  // Edit Mode Toggle
  const [isEditing, setIsEditing] = useState(false);

  // Registration Details Form State
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [about, setAbout] = useState(user?.about || "");
  const [countryName, setCountryName] = useState(user?.countryName || "India");
  const [countryCode, setCountryCode] = useState(user?.countryCode || "IN");
  const [region, setRegion] = useState(user?.region || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [city, setCity] = useState(user?.city || "");
  const [postalCode, setPostalCode] = useState(user?.postalCode || "");
  const [currency, setCurrency] = useState(user?.currency || "INR");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Cancel edits and reset state to current user prop values
  const handleCancel = useCallback(() => {
    setName(user?.name || "");
    setStoreName(user?.storeName || "");
    setAbout(user?.about || "");
    setCountryName(user?.countryName || "India");
    setCountryCode(user?.countryCode || "IN");
    setRegion(user?.region || "");
    setDistrict(user?.district || "");
    setCity(user?.city || "");
    setPostalCode(user?.postalCode || "");
    setCurrency(user?.currency || "INR");
    setErrors({});
    setIsEditing(false);
  }, [user]);

  // Submit updated details
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = {};

      if (!name.trim()) {
        validationErrors.name = "Full name is required.";
      }

      if (user?.role === "vendor" && !storeName.trim()) {
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
        countryName: countryName.trim(),
        countryCode: countryCode.trim(),
        region: region ? region.trim() : null,
        district: district ? district.trim() : null,
        city: city ? city.trim() : null,
        postalCode: postalCode ? postalCode.trim() : null,
        currency,
        ...(user?.role === "vendor"
          ? {
              storeName: storeName.trim(),
              about: about ? about.trim() : null,
            }
          : {}),
      };

      try {
        if (!user?.id) throw new Error("No authenticated user profile found.");
        await updateProfile(user.id, payload);
        notifySuccess("Registered details updated successfully!");
        setIsEditing(false);
      } catch (err) {
        notifyError(err.message || "Failed to update profile.");
      } finally {
        setSubmitting(false);
      }
    },
    [name, storeName, about, countryName, countryCode, region, district, city, postalCode, currency, user, updateProfile, notifySuccess, notifyError]
  );

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "U";
  const roleLabel =
    user?.role === "admin"
      ? "Platform Admin"
      : user?.role === "vendor"
      ? "Vendor / Seller"
      : "Customer";

  return (
    <div className="fc-page-transition" style={{ maxWidth: "780px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        className="fc-page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 className="fc-h1">Registered Account Profile</h1>
          <p className="fc-muted fc-mt-8">
            Review and update your personal, business, and location details gathered during registration.
          </p>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsEditing(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          >
            <Edit size={16} /> Edit Details
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <X size={16} /> Cancel Editing
          </Button>
        )}
      </div>

      {/* Header Profile Overview Card */}
      <div
        className="fc-panel"
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
          marginBottom: "24px",
          padding: "20px 24px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: "var(--brand-light)",
            color: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: "bold",
            border: "2px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 className="fc-h3" style={{ margin: 0 }}>{user?.name}</h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "12px",
                background: "var(--brand-light)",
                color: "var(--brand)",
                textTransform: "uppercase",
              }}
            >
              {roleLabel}
            </span>
            {user?.verificationStatus && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "12px",
                  background: user.verificationStatus === "Verified" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-soft)",
                  color: user.verificationStatus === "Verified" ? "var(--brand)" : "var(--text-muted)",
                }}
              >
                ✓ {user.verificationStatus}
              </span>
            )}
          </div>
          <p className="fc-soft" style={{ marginTop: "4px", marginBottom: 0, fontSize: 13 }}>
            {user?.email} {user?.storeName ? `• ${user.storeName}` : ""}
          </p>
        </div>
      </div>

      {/* VIEW MODE: Display All Details Gathered During Registration */}
      {!isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Section 1: Basic Identity Details */}
          <div className="fc-panel">
            <h3 className="fc-h3 fc-mb-16" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} /> Basic Identity Details
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px 24px",
                fontSize: 13.5,
              }}
            >
              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Full Name
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.name || "Not provided"}</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Email Address
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.email || "Not provided"}</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Account Role
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{roleLabel}</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Preferred Currency
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>
                  {user?.currency ? `${user.currency} (₹)` : "INR (₹)"}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 2: Vendor Business Details (If Vendor) */}
          {user?.role === "vendor" && (
            <div className="fc-panel">
              <h3 className="fc-h3 fc-mb-16" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Store size={18} /> Vendor Business Information
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px 24px",
                  fontSize: 13.5,
                }}
              >
                <div>
                  <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Store / Business Name
                  </span>
                  <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.storeName || "Not provided"}</strong>
                </div>

                <div>
                  <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Verification Status
                  </span>
                  <strong style={{ color: "var(--brand)", fontSize: 14 }}>{user?.verificationStatus || "Pending Verification"}</strong>
                </div>
              </div>

              {user?.about && (
                <div style={{ marginTop: 16 }}>
                  <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Store Description / About
                  </span>
                  <div
                    style={{
                      background: "var(--bg-soft)",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--text)",
                    }}
                  >
                    {user.about}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Registered Location & Address */}
          <div className="fc-panel">
            <h3 className="fc-h3 fc-mb-16" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={18} /> Registered Location & Address
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px 24px",
                fontSize: 13.5,
              }}
            >
              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Country
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.countryName || "India"} ({user?.countryCode || "IN"})</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  State / Region
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.region || "Not specified"}</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  District
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.district || "Not specified"}</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  City / Village
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.city || "Not specified"}</strong>
              </div>

              <div>
                <span className="fc-soft" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Postal Code
                </span>
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{user?.postalCode || "Not specified"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE: Interactive Form to Edit All Registered Details */
        <form onSubmit={handleSubmit} className="fc-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 className="fc-h3" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            Edit Registered Account Details
          </h3>

          {/* Identity Fields */}
          <div>
            <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12, color: "var(--brand)" }}>1. Identity & Profile Information</h4>
            <div className="fc-form-row">
              <FormField label="Full Name" error={errors.name}>
                <input
                  className={`fc-input ${errors.name ? "fc-input-error" : ""}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </FormField>
              <FormField label="Registered Email Address">
                <input
                  className="fc-input"
                  type="email"
                  value={email}
                  disabled
                  style={{ background: "var(--bg-soft)", color: "var(--text-soft)", cursor: "not-allowed" }}
                />
              </FormField>
            </div>
          </div>

          {/* Vendor Specific Details */}
          {user?.role === "vendor" && (
            <div>
              <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12, color: "var(--brand)" }}>2. Business & Store Information</h4>
              <div className="fc-form-row">
                <FormField label="Store / Business Name" error={errors.storeName}>
                  <input
                    className={`fc-input ${errors.storeName ? "fc-input-error" : ""}`}
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Green Harvest Agri Farm"
                    required
                  />
                </FormField>

                <FormField label="Preferred Currency">
                  <select
                    className="fc-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Store Description / About" style={{ marginTop: 12 }}>
                <textarea
                  className="fc-input"
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Describe your organic products, farm practices, or business details..."
                  style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </FormField>
            </div>
          )}

          {/* Customer Specific Currency */}
          {user?.role === "customer" && (
            <div className="fc-form-row">
              <FormField label="Preferred Currency">
                <select
                  className="fc-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          {/* Location Fields */}
          <div>
            <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12, color: "var(--brand)" }}>
              {user?.role === "vendor" ? "3. Location & Address" : "2. Location & Address"}
            </h4>
            <div className="fc-form-row">
              <FormField label="Country Name">
                <input
                  className="fc-input"
                  type="text"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  placeholder="e.g. India"
                />
              </FormField>
              <FormField label="Country Code">
                <input
                  className="fc-input"
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="e.g. IN"
                />
              </FormField>
              <FormField label="State / Region">
                <input
                  className="fc-input"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                />
              </FormField>
            </div>

            <div className="fc-form-row" style={{ marginTop: 12 }}>
              <FormField label="District">
                <input
                  className="fc-input"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Coimbatore"
                />
              </FormField>
              <FormField label="City / Village">
                <input
                  className="fc-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pollachi"
                />
              </FormField>
              <FormField label="Postal Code">
                <input
                  className="fc-input"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 641001"
                />
              </FormField>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} style={{ padding: "10px 24px", fontWeight: 700 }}>
              <Check size={14} style={{ marginRight: "6px" }} />
              {submitting ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export const ProfileSettings = memo(ProfileSettingsBase);
export default ProfileSettings;

import { useState, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { Button } from "../../components/common/Button.jsx";
import { OTPInput } from "../../components/common/OTPInput.jsx";
import { Countdown } from "../../components/common/Countdown.jsx";
import { Sprout, Check, Tractor, Store, AlertTriangle, Mail} from "../../components/icons/Icons.jsx";
import PublicHeader from "../../components/layout/PublicHeader.jsx";
import { GlobalLocationSelector } from "../../components/common/GlobalLocationSelector.jsx";

function RegisterBase() {
  const { t } = useLanguage();
  const { registerCustomer, registerVendor, sendOTP, verifyOTP } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0 = role select, 1 = basic info, 2 = location, 3 = password & OTP verify, 4 = review & complete
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    businessCategory: "Organic Goods",
    about: "",
    agreeTerms: false});

  const [locationObj, setLocationObj] = useState({
    countryCode: "IN",
    countryName: "India",
    region: "",
    district: "",
    city: "",
    address: "",
    postalCode: "",
    currency: "INR"});

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const updateField = useCallback((field, value) => {
    setForm((prev) => {
      if (field === "email" && prev.email !== value) {
        setOtpSent(false);
        setOtpVerified(false);
        setOtpCode("");
      }
      return { ...prev, [field]: value };
    });
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setApiError("");
  }, []);

  // Handle Send / Resend OTP
  const handleSendOtpClick = useCallback(async () => {
    if (!form.email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      return;
    }

    setOtpLoading(true);
    setApiError("");
    setOtpVerified(false);
    setOtpCode("");

    try {
      const purpose = role === "vendor" ? "register_vendor" : "register_customer";
      const res = await sendOTP(form.email.trim(), purpose);
      setOtpSent(true);
      notifySuccess(res.message || "Verification OTP sent to your email.");
    } catch (err) {
      setApiError(err.message || "Unable to send verification email. Please try again.");
      notifyError(err.message || "Unable to send verification email. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }, [form.email, role, sendOTP, notifySuccess, notifyError]);

  // Handle Verify OTP
  const handleVerifyOtpClick = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: "Please enter the full 6-digit OTP code." }));
      return;
    }

    setOtpLoading(true);
    setApiError("");

    try {
      const purpose = role === "vendor" ? "register_vendor" : "register_customer";
      await verifyOTP(form.email.trim(), otpCode.trim(), purpose);
      setOtpVerified(true);
      notifySuccess("OTP verified successfully!");
    } catch (err) {
      const errMsg = err.message || "Invalid verification code. Please check your email and try again.";
      setErrors((prev) => ({ ...prev, otp: errMsg }));
      setApiError(errMsg);
      notifyError(errMsg);
    } finally {
      setOtpLoading(false);
    }
  }, [form.email, otpCode, role, verifyOTP, notifySuccess, notifyError]);

  const validateStep = useCallback(
    (stepNum) => {
      const errs = {};
      if (stepNum === 1) {
        if (!form.name.trim()) errs.name = "Full name is required.";
        if (!form.email.trim()) errs.email = "Email address is required.";
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address.";

        if (role === "vendor" && !form.storeName.trim()) {
          errs.storeName = "Store / Business name is required.";
        }
      }

      if (stepNum === 2) {
        if (!locationObj.countryCode) errs.location = "Please select your country.";
      }

      if (stepNum === 3) {
        if (!form.password) errs.password = "Password is required.";
        else if (form.password.length < 6) errs.password = "Password must be at least 6 characters.";
        if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match.";

        if (!otpVerified) {
          errs.otp = "Please send and verify the 6-digit Email OTP before proceeding.";
        }
      }

      if (stepNum === 4) {
        if (!form.agreeTerms) {
          errs.agreeTerms = "You must agree to the Terms of Service to register.";
        }
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [form, role, locationObj, otpVerified]
  );

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
    setApiError("");
  }, []);

  const handleSelectRole = useCallback((r) => {
    setRole(r);
    setStep(1);
    setApiError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setApiError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.mobile ? form.mobile.trim() : null,
      mobile: form.mobile ? form.mobile.trim() : null,
      storeName: form.storeName ? form.storeName.trim() : null,
      businessCategory: form.businessCategory || "Organic Goods",
      countryCode: locationObj.countryCode || "IN",
      countryName: locationObj.countryName || "India",
      region: locationObj.region || null,
      district: locationObj.district || null,
      city: locationObj.city || null,
      address: locationObj.address || null,
      postalCode: locationObj.postalCode || null,
      lat: locationObj.lat || null,
      lng: locationObj.lng || null,
      currency: locationObj.currency || "INR",
      about: form.about || null};

    try {
      if (role === "vendor") {
        await registerVendor(payload);
        notifySuccess("Vendor account created & verified successfully!");
        navigate("/vendor/dashboard", { replace: true });
      } else {
        await registerCustomer(payload);
        notifySuccess("Customer account created & verified successfully!");
        navigate("/customer/marketplace", { replace: true });
      }
    } catch (err) {
      setApiError(err.message || "Registration failed. Please try again.");
      notifyError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }, [form, role, locationObj, validateStep, registerCustomer, registerVendor, navigate, notifySuccess, notifyError]);

  const totalSteps = 4;
  const stepLabels = [
    "Basic Info",
    role === "vendor" ? "Store Info & Address" : "Location & Address",
    "Password & OTP Verification",
    "Review & Agree",
  ];

  const renderField = (label, field, type = "text", placeholder = "", required = false) => (
    <div className="fc-field" style={{ marginBottom: 16 }}>
      <label className={`fc-label ${required ? "fc-label-required" : ""}`}>{label}</label>
      {type === "textarea" ? (
        <textarea
          className={`fc-textarea ${errors[field] ? "fc-textarea-error" : ""}`}
          value={form[field]}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          className={`fc-input ${errors[field] ? "fc-input-error" : ""}`}
          type={type}
          value={form[field]}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
        />
      )}
      {errors[field] && <span className="fc-error-text" style={{ color: "var(--danger)", fontSize: 12 }}>{errors[field]}</span>}
    </div>
  );

  return (
    <>
      <PublicHeader />
      <div
        className="fc-page-transition"
        style={{
          minHeight: "calc(100vh - 70px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          background: "linear-gradient(135deg, rgba(2, 44, 34, 0.85) 0%, rgba(6, 78, 59, 0.8) 50%, rgba(2, 31, 24, 0.9) 100%), url('/ecomart_bg.jpg') center/cover no-repeat fixed"}}
      >
        <div style={{ maxWidth: step === 0 ? "860px" : "560px", width: "100%" }}>
          {/* STEP 0: ROLE SELECTION */}
          {step === 0 && (
            <div className="fc-fade-in">
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "6px 16px", borderRadius: "999px", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                  <Sprout size={14} /> Create Your EcoMart Account
                </div>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                  Join EcoMart Marketplace
                </h1>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", maxWidth: 500, margin: "0 auto" }}>
                  Select your role to start registering with Email OTP verification.
                </p>
              </div>

              <div className="fc-role-select-grid" style={{ margin: "0 0 24px" }}>
                <div className="fc-role-card" onClick={() => handleSelectRole("customer")} style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)" }}>
                  <div className="fc-role-card-icon" style={{ background: "var(--gradient-hero)" }}>
                    <Store size={26} />
                  </div>
                  <h3 className="fc-h2" style={{ marginBottom: 8 }}>Register as Customer</h3>
                  <p className="fc-muted" style={{ marginBottom: 16 }}>Discover sustainable products, trace carbon footprint, and earn green rewards.</p>
                  <Button variant="primary" style={{ width: "100%" }}>Customer Registration</Button>
                </div>

                <div className="fc-role-card" onClick={() => handleSelectRole("vendor")} style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)" }}>
                  <div className="fc-role-card-icon" style={{ background: "var(--gradient-accent)" }}>
                    <Tractor size={26} />
                  </div>
                  <h3 className="fc-h2" style={{ marginBottom: 8 }}>Register as Vendor</h3>
                  <p className="fc-muted" style={{ marginBottom: 16 }}>Set up your sustainable store, list eco products, and manage direct orders.</p>
                  <Button variant="accent" style={{ width: "100%" }}>Vendor Registration</Button>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                  Already registered?{" "}
                  <Link to="/login" style={{ color: "#fff", fontWeight: 700, textDecoration: "underline" }}>Sign In to Portal</Link>
                </p>
              </div>
            </div>
          )}

          {/* STEPS 1-4: FORM CARD */}
          {step > 0 && (
            <div className="fc-card fc-card-pad-lg fc-slide-up" style={{ padding: 36, borderRadius: "24px", background: "rgba(255, 255, 255, 0.98)" }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div className="fc-flex-center" style={{ gap: 8, marginBottom: 8 }}>
                  <Sprout size={22} style={{ color: "var(--brand)" }} />
                  <span style={{ fontWeight: 800, fontSize: "20px", color: "var(--text)" }}>EcoMart</span>
                </div>
                <h2 className="fc-h2" style={{ marginBottom: 4, fontSize: 22, fontWeight: 800 }}>
                  {role === "vendor" ? "Vendor Account Registration" : "Customer Account Registration"}
                </h2>
                <p className="fc-muted" style={{ fontSize: 13 }}>Step {step} of {totalSteps}</p>
              </div>

              {/* Progress Steps Bar */}
              <div className="fc-progress-steps" style={{ marginBottom: 24 }}>
                {stepLabels.map((label, i) => (
                  <div key={i} className={`fc-progress-step ${i + 1 === step ? "active" : ""} ${i + 1 < step ? "completed" : ""}`}>
                    <div className="fc-progress-step-num">{i + 1 < step ? <Check size={12} /> : i + 1}</div>
                    <div className="fc-progress-step-label">{label}</div>
                  </div>
                ))}
              </div>

              {/* API Error Notification */}
              {apiError && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: "12px", marginBottom: 20, fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
                  <AlertTriangle size={18} /> {apiError}
                </div>
              )}

              {/* STEP 1: Basic Info */}
              {step === 1 && (
                <div className="fc-fade-in">
                  {renderField("Full Name", "name", "text", "Enter your full name", true)}
                  {renderField("Email Address", "email", "email", "you@example.com", true)}
                  {renderField("Mobile Number", "mobile", "tel", "e.g. +91 9876543210")}

                  {role === "vendor" && (
                    <>
                      {renderField("Store / Business Name", "storeName", "text", "e.g., Green Earth Agri Supplies", true)}
                      <div className="fc-field" style={{ marginBottom: 16 }}>
                        <label className="fc-label">Business Category</label>
                        <select
                          className="fc-select"
                          value={form.businessCategory}
                          onChange={(e) => updateField("businessCategory", e.target.value)}
                        >
                          <option value="Organic Produce">Organic Produce & Crops</option>
                          <option value="Sustainable Packaging">Sustainable Packaging & Goods</option>
                          <option value="Bio-Fertilizers">Bio-Fertilizers & Soil Care</option>
                          <option value="Solar & Clean Tech">Solar & Clean Technology</option>
                          <option value="Eco-Friendly Daily Products">Eco-Friendly Daily Products</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 2: Location & Address */}
              {step === 2 && (
                <div className="fc-fade-in">
                  <div className="fc-field" style={{ marginBottom: 16 }}>
                    <label className="fc-label fc-label-required">Location & Address</label>
                    <GlobalLocationSelector
                      value={locationObj}
                      onChange={(newLoc) => {
                        setLocationObj(newLoc);
                        setErrors((prev) => ({ ...prev, location: "" }));
                      }}
                      showAddressFields={true}
                    />
                    {errors.location && <span className="fc-error-text" style={{ color: "var(--danger)", fontSize: "12px" }}>{errors.location}</span>}
                  </div>

                  {role === "vendor" && renderField("About Your Business", "about", "textarea", "Tell us about your organic produce, farm location, or sustainable practices...")}
                </div>
              )}

              {/* STEP 3: Password & Email OTP Verification */}
              {step === 3 && (
                <div className="fc-fade-in">
                  {renderField("Password", "password", "password", "Minimum 6 characters", true)}
                  {renderField("Confirm Password", "confirmPassword", "password", "Re-enter your password", true)}

                  {/* Email OTP Verification Section */}
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.06)",
                      border: "1.5px solid rgba(52, 211, 153, 0.3)",
                      borderRadius: "16px",
                      padding: "20px",
                      marginTop: 20,
                      marginBottom: 16}}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Mail size={18} style={{ color: "var(--brand)" }} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                          Email OTP Verification
                        </span>
                      </div>

                      {otpVerified && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#166534", padding: "4px 12px", borderRadius: "20px", fontSize: 12, fontWeight: 800 }}>
                          <Check size={14} /> Email Verified
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "0 0 14px 0" }}>
                      We will send a 6-digit security code to <strong>{form.email}</strong> to verify your account before registration.
                    </p>

                    {!otpSent ? (
                      <Button
                        type="button"
                        variant="primary"
                        full
                        disabled={otpLoading}
                        onClick={handleSendOtpClick}
                        style={{ padding: "10px", fontWeight: 700 }}
                      >
                        {otpLoading ? "Sending OTP Code..." : "Send Verification OTP"}
                      </Button>
                    ) : (
                      <div>
                        {!otpVerified ? (
                          <>
                            <OTPInput
                              value={otpCode}
                              onChange={(val) => {
                                setOtpCode(val);
                                setErrors((prev) => ({ ...prev, otp: "" }));
                              }}
                              disabled={otpLoading}
                              error={!!errors.otp}
                            />

                            {errors.otp && (
                              <div style={{ color: "var(--danger)", fontSize: 12, textAlign: "center", marginBottom: 10, fontWeight: 600 }}>
                                {errors.otp}
                              </div>
                            )}

                            <Button
                              type="button"
                              variant="primary"
                              full
                              disabled={otpLoading || otpCode.length !== 6}
                              onClick={handleVerifyOtpClick}
                              style={{ padding: "10px", fontWeight: 700, marginTop: 10 }}
                            >
                              {otpLoading ? "Verifying..." : "Verify OTP Code"}
                            </Button>

                            <Countdown
                              seconds={60}
                              onResend={handleSendOtpClick}
                              disabled={otpLoading}
                            />
                          </>
                        ) : (
                          <div style={{ textAlign: "center", padding: "10px", color: "var(--brand)", fontWeight: 700, fontSize: 14 }}>
                            ✓ 6-Digit Email OTP verified successfully! You can now proceed.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Terms & Review */}
              {step === 4 && (
                <div className="fc-fade-in">
                  <div className="fc-panel" style={{ marginBottom: 20, background: "var(--bg-soft)", padding: 20, borderRadius: "16px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--brand)", marginBottom: 12 }}>
                      Account Summary Review
                    </div>
                    <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                      <div className="fc-flex-between"><span className="fc-muted">Role</span><strong>{role === "vendor" ? "Vendor / Seller" : "Customer / Buyer"}</strong></div>
                      <div className="fc-flex-between"><span className="fc-muted">Full Name</span><strong>{form.name}</strong></div>
                      <div className="fc-flex-between"><span className="fc-muted">Email</span><strong>{form.email}</strong></div>
                      {form.mobile && <div className="fc-flex-between"><span className="fc-muted">Mobile</span><strong>{form.mobile}</strong></div>}
                      {form.storeName && role === "vendor" && <div className="fc-flex-between"><span className="fc-muted">Store Name</span><strong>{form.storeName}</strong></div>}
                      <div className="fc-flex-between"><span className="fc-muted">Country</span><strong>{locationObj.countryName} ({locationObj.countryCode})</strong></div>
                      <div className="fc-flex-between"><span className="fc-muted">OTP Status</span><strong style={{ color: "var(--brand)" }}>✓ Email OTP Verified</strong></div>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13.5, color: "var(--text)" }}>
                      <input
                        type="checkbox"
                        checked={form.agreeTerms}
                        onChange={(e) => updateField("agreeTerms", e.target.checked)}
                        style={{ accentColor: "var(--brand)", width: 18, height: 18, marginTop: 2, cursor: "pointer" }}
                      />
                      <span>
                        I agree to EcoMart's <strong style={{ color: "var(--brand)" }}>Terms of Service</strong> and <strong style={{ color: "var(--brand)" }}>Privacy Policy</strong>.
                      </span>
                    </label>
                    {errors.agreeTerms && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4, fontWeight: 600 }}>{errors.agreeTerms}</div>}
                  </div>
                </div>
              )}

              {/* Step Navigation Actions */}
              <div className="fc-flex-between" style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <Button variant="ghost" onClick={step === 1 ? () => setStep(0) : handleBack}>
                  Back
                </Button>
                {step < 4 ? (
                  <Button variant="primary" onClick={handleNext}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={loading || !form.agreeTerms || !otpVerified}
                    style={{
                      padding: "12px 28px",
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                      boxShadow: "0 6px 18px rgba(16, 185, 129, 0.4)"}}
                  >
                    {loading ? "Creating Verified Account..." : "Complete Registration"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const Register = memo(RegisterBase);
export default Register;

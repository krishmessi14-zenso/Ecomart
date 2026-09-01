import { useState, useCallback, useEffect, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { Sprout, AlertTriangle, Check } from "../../components/icons/Icons.jsx";
import PublicHeader from "../../components/layout/PublicHeader.jsx";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-1.5 1.5l-3 3m-2 2l-3 3m-2 2l-4 4a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l4-4m4-4l3-3m3-3l2-2" />
    <circle cx="7.5" cy="16.5" r="3.5" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function ForgotPasswordBase() {
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer countdown for Resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((v) => !v);
  }, []);

  // Step 1: Send OTP to email
  const handleSendOtp = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      setErrorText("");
      if (!email.trim()) {
        setErrors({ email: "Please enter your registered email address." });
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send verification code.");
        }

        const data = await res.json();
        setDemoOtp(data.debugOtp || "");
        setStep(2);
        setResendCooldown(30);
        notifySuccess(data.message || "6-digit verification code sent!");
      } catch (err) {
        if (err.name === "TypeError" || err.message?.includes("fetch")) {
          setErrorText("Unable to connect to the backend server. Please make sure the backend server is running.");
        } else {
          setErrorText(err.message || "Failed to send verification code.");
        }
      } finally {
        setLoading(false);
      }
    },
    [email, notifySuccess]
  );

  // Step 2: Verify OTP Code ONLY
  const handleVerifyOtpOnly = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorText("");

      if (!otp.trim()) {
        setErrors({ otp: "6-digit verification code is required." });
        return;
      }
      if (otp.trim().length !== 6) {
        setErrors({ otp: "Verification code must be exactly 6 digits." });
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        const res = await fetch("/api/auth/verify-otp-only", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Invalid 6-digit verification code.");
        }

        notifySuccess("OTP Code verified! Please enter your new password.");
        setStep(3); // Advance to New Password page
      } catch (err) {
        setErrorText(err.message || "Failed to verify OTP code.");
      } finally {
        setLoading(false);
      }
    },
    [email, otp, notifySuccess]
  );

  // Step 3: Update New Password
  const handleUpdatePassword = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorText("");
      const validationErrors = {};

      if (!newPassword) {
        validationErrors.newPassword = "New password is required.";
      } else if (newPassword.length < 6) {
        validationErrors.newPassword = "Password must be at least 6 characters.";
      }

      if (newPassword !== confirmPassword) {
        validationErrors.confirmPassword = "Passwords do not match.";
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        const res = await fetch("/api/auth/verify-otp-reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
            newPassword,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to reset password.");
        }

        const data = await res.json();
        setStep(4); // Advance to Success Screen
        notifySuccess(data.message || "Password updated successfully!");
      } catch (err) {
        setErrorText(err.message || "Failed to reset password.");
      } finally {
        setLoading(false);
      }
    },
    [email, otp, newPassword, confirmPassword, notifySuccess]
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-soft)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        <div
          className="fc-card"
          style={{
            width: "100%",
            maxWidth: "920px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            overflow: "hidden",
            boxShadow: "var(--shadow-xl)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Left Side: AgriTech Hero Branding */}
          <div
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)",
              color: "#ffffff",
              padding: "44px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 2 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 28,
                  cursor: "pointer",
                }}
                onClick={() => navigate("/")}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: 8,
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                  }}
                >
                  <Sprout size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
                    EcoMart
                  </h3>
                  <span style={{ fontSize: 11, opacity: 0.85, letterSpacing: "1px", textTransform: "uppercase" }}>
                    OTP ACCOUNT RECOVERY
                  </span>
                </div>
              </div>

              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 14px 0", lineHeight: 1.25 }}>
                Fast & Secure 6–Digit OTP Recovery
              </h2>

              <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, margin: "0 0 28px 0" }}>
                We'll send a 6-digit verification code to your email to safely reset your password.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justify: "center" }}>
                    <Check size={13} />
                  </span>
                  <span>Instant 6-Digit OTP Verification</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justify: "center" }}>
                    <Check size={13} />
                  </span>
                  <span>10-Minute Secure Expiry Window</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justify: "center" }}>
                    <Check size={13} />
                  </span>
                  <span>Seamless Mobile & Web Access for Farmers & Vendors</span>
                </div>
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 2, marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 12, opacity: 0.85 }}>
              © 2026 EcoMart B2B AgriTech. All rights reserved.
            </div>
          </div>

          {/* Right Side: Recovery Form */}
          <div style={{ padding: "40px 36px", background: "var(--surface)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Badge variant="primary" size="sm">OTP Verification</Badge>
                <span style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 600 }}>
                  Step {step} of 3
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "var(--text)" }}>
                {step === 1 && "Forgot Password?"}
                {step === 2 && "Enter Verification Code"}
                {step === 3 && "Set New Password"}
                {step === 4 && "Password Updated!"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-soft)", margin: 0 }}>
                {step === 1 && "Enter your registered email address to receive a 6-digit verification code."}
                {step === 2 && `Enter the 6-digit OTP code sent to ${email}.`}
                {step === 3 && "Create a new secure password for your EcoMart account."}
                {step === 4 && "Your password has been successfully reset. You can now log in."}
              </p>
            </div>

            {/* Error Alert */}
            {errorText && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--danger-light)",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 20,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={18} />
                <span>{errorText}</span>
              </div>
            )}

            {/* STEP 1: Enter Email & Send OTP */}
            {step === 1 && (
              <form onSubmit={handleSendOtp}>
                <FormField label={t("public.email") || "Registered Email Address"} error={errors.email}>
                  <input
                    className={`fc-input ${errors.email ? "fc-input-error" : ""}`}
                    type="email"
                    placeholder="e.g. farmer@example.com"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </FormField>

                <Button type="submit" variant="primary" full disabled={loading} style={{ marginTop: 16, padding: "12px", fontWeight: 700 }}>
                  {loading ? "Sending Code..." : "Send 6-Digit Code"}
                </Button>
              </form>
            )}

            {/* STEP 2: Enter Verification Code (OTP) ONLY */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtpOnly}>
                {/* Simulated Demo OTP Toast Banner */}
                {demoOtp && (
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid var(--brand)",
                      color: "var(--brand)",
                      padding: "12px 16px",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: 20,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <strong>Demo OTP Notification:</strong> Your 6-digit code is{" "}
                      <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>{demoOtp}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtp(demoOtp)}
                      style={{
                        background: "var(--brand)",
                        color: "#fff",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--text-soft)" }}>Sending code to <strong>{email}</strong></span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Change Email
                  </button>
                </div>

                <FormField label="6-Digit Verification Code (OTP)" error={errors.otp}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: 12, color: "var(--text-soft)", display: "flex" }}>
                      <KeyIcon />
                    </div>
                    <input
                      className={`fc-input ${errors.otp ? "fc-input-error" : ""}`}
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      style={{ paddingLeft: 36, letterSpacing: "4px", fontSize: "16px", fontWeight: "700", fontFamily: "monospace" }}
                      required
                    />
                  </div>
                </FormField>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -6, marginBottom: 20 }}>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleSendOtp}
                    style={{
                      background: "none",
                      border: "none",
                      color: resendCooldown > 0 ? "var(--text-muted)" : "var(--brand)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: resendCooldown > 0 ? "default" : "pointer",
                    }}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend OTP Code"}
                  </button>
                </div>

                <Button type="submit" variant="primary" full disabled={loading || otp.trim().length !== 6} style={{ padding: "12px", fontWeight: 700 }}>
                  {loading ? "Verifying OTP..." : "Verify OTP Code"}
                </Button>
              </form>
            )}

            {/* STEP 3: Set New Password Page */}
            {step === 3 && (
              <form onSubmit={handleUpdatePassword}>
                <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 18, fontSize: 12.5, color: "var(--brand)", fontWeight: 700 }}>
                  ✓ OTP Verified for {email}
                </div>

                <FormField label="New Password" error={errors.newPassword}>
                  <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: 12, color: "var(--text-soft)", display: "flex" }}>
                      <LockIcon />
                    </div>
                    <input
                      className={`fc-input ${errors.newPassword ? "fc-input-error" : ""}`}
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: 36, paddingRight: 40 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      style={{
                        position: "absolute",
                        right: 12,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-soft)",
                        display: "flex",
                        padding: 4,
                      }}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm Password" error={errors.confirmPassword}>
                  <input
                    className={`fc-input ${errors.confirmPassword ? "fc-input-error" : ""}`}
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </FormField>

                <Button type="submit" variant="primary" full disabled={loading} style={{ marginTop: 20, padding: "12px", fontWeight: 700 }}>
                  {loading ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                  <Check size={32} />
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 800, margin: "0 0 8px 0" }}>
                  Password Reset Successful!
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 24 }}>
                  Your password has been updated. You can now sign in with your new credentials.
                </p>
                <Button variant="primary" full onClick={() => navigate("/login")} style={{ padding: "12px", fontWeight: 700 }}>
                  Sign In Now
                </Button>
              </div>
            )}

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Link to="/login" style={{ color: "var(--text-soft)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                ← Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ForgotPassword = memo(ForgotPasswordBase);
export default ForgotPassword;

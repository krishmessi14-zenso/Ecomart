import { useState, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { OTPInput } from "../../components/common/OTPInput.jsx";
import { Countdown } from "../../components/common/Countdown.jsx";
import { Sprout, AlertTriangle, Check, Eye, EyeOff } from "../../components/icons/Icons.jsx";
import PublicHeader from "../../components/layout/PublicHeader.jsx";
import { authService } from "../../services/authService.js";

function ForgotPasswordBase() {
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success Animation
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (!/\S+@\S+\.\S+/.test(email.trim())) {
        setErrors({ email: "Please enter a valid email address." });
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        const res = await authService.forgotPasswordSendOTP(email.trim());
        setDemoOtp(res.debugOtp || "");
        setStep(2);
        notifySuccess(res.message || "6-digit OTP code sent to your email!");
      } catch (err) {
        setErrorText(err.message || "Failed to send verification code.");
        notifyError(err.message || "Failed to send OTP.");
      } finally {
        setLoading(false);
      }
    },
    [email, notifySuccess, notifyError]
  );

  // Step 2: Verify OTP Code
  const handleVerifyOtp = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorText("");

      if (!otp || otp.trim().length !== 6) {
        setErrors({ otp: "Please enter the full 6-digit OTP code." });
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        await authService.forgotPasswordVerifyOTP(email.trim(), otp.trim());
        notifySuccess("OTP Verified! Please set your new password.");
        setStep(3); // Move to New Password step
      } catch (err) {
        setErrorText(err.message || "Failed to verify OTP code.");
        notifyError(err.message || "OTP verification failed.");
      } finally {
        setLoading(false);
      }
    },
    [email, otp, notifySuccess, notifyError]
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
        validationErrors.newPassword = "Password must be at least 6 characters long.";
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
        const res = await authService.resetPassword(email.trim(), otp.trim(), newPassword);
        setStep(4); // Advance to Success Screen
        notifySuccess(res.message || "Password updated successfully!");
      } catch (err) {
        setErrorText(err.message || "Failed to reset password.");
        notifyError(err.message || "Password reset failed.");
      } finally {
        setLoading(false);
      }
    },
    [email, otp, newPassword, confirmPassword, notifySuccess, notifyError]
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, rgba(2, 44, 34, 0.85) 0%, rgba(6, 78, 59, 0.8) 50%, rgba(2, 31, 24, 0.9) 100%), url('/ecomart_bg.jpg') center/cover no-repeat fixed", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px"}}
      >
        <div
          className="fc-card"
          style={{
            width: "100%",
            maxWidth: "920px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            borderRadius: "24px",
            border: "1px solid rgba(52, 211, 153, 0.2)"}}
        >
          {/* Left Side Branding */}
          <div
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)",
              color: "#ffffff",
              padding: "44px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"}}
          >
            <div style={{ position: "relative", zIndex: 2 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 28,
                  cursor: "pointer"}}
                onClick={() => navigate("/")}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: 8,
                    borderRadius: "12px",
                    display: "flex"}}
                >
                  <Sprout size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
                    EcoMart
                  </h3>
                  <span style={{ fontSize: 11, opacity: 0.85, letterSpacing: "1px", textTransform: "uppercase" }}>
                    EMAIL OTP PASSWORD RECOVERY
                  </span>
                </div>
              </div>

              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 14px 0", lineHeight: 1.25 }}>
                Fast & Secure 6–Digit OTP Recovery
              </h2>

              <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, margin: "0 0 28px 0" }}>
                We'll send a 6-digit verification code to your registered email to safely reset your password.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={13} />
                  </span>
                  <span>Cryptographically Secure 6-Digit Code</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justify: "center" }}>
                    <Check size={13} />
                  </span>
                  <span>10-Minute Expiry & Rate Limited Security</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justify: "center" }}>
                    <Check size={13} />
                  </span>
                  <span>Instant Reset for Farmers, Vendors & Customers</span>
                </div>
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 2, marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 12, opacity: 0.85 }}>
              © {new Date().getFullYear()} EcoMart B2B AgriTech. All rights reserved.
            </div>
          </div>

          {/* Right Side Form */}
          <div style={{ padding: "40px 36px", background: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Badge variant="primary" size="sm">Email OTP Reset</Badge>
                <span style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 600 }}>
                  Step {step} of 3
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "var(--text)" }}>
                {step === 1 && "Forgot Password?"}
                {step === 2 && "Enter 6-Digit OTP Code"}
                {step === 3 && "Set New Password"}
                {step === 4 && "Password Reset Complete!"}
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
                  background: "var(--danger-light, #fef2f2)",
                  border: "1px solid var(--danger, #ef4444)",
                  color: "var(--danger, #dc2626)",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  marginBottom: 20,
                  fontSize: 13,
                  fontWeight: 600}}
              >
                <AlertTriangle size={18} />
                <span>{errorText}</span>
              </div>
            )}

            {/* STEP 1: Enter Registered Email & Send OTP */}
            {step === 1 && (
              <form onSubmit={handleSendOtp}>
                <FormField label="Registered Email Address" error={errors.email}>
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
                  {loading ? "Sending OTP Code..." : "Send 6-Digit Code"}
                </Button>
              </form>
            )}

            {/* STEP 2: Enter 6-Digit OTP Code */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp}>
                {/* Simulated Demo OTP Toast Banner */}
                {demoOtp && (
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1e40af",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      marginBottom: 16,
                      fontSize: 12.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"}}
                  >
                    <div>
                      <strong>Demo OTP:</strong> <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>{demoOtp}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtp(demoOtp)}
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer"}}
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
                  <OTPInput
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setErrors((prev) => ({ ...prev, otp: "" }));
                    }}
                    disabled={loading}
                    error={!!errors.otp}
                  />
                </FormField>

                <Countdown seconds={60} onResend={handleSendOtp} disabled={loading} />

                <Button type="submit" variant="primary" full disabled={loading || otp.trim().length !== 6} style={{ marginTop: 16, padding: "12px", fontWeight: 700 }}>
                  {loading ? "Verifying OTP Code..." : "Verify OTP Code"}
                </Button>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {step === 3 && (
              <form onSubmit={handleUpdatePassword}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: "10px", marginBottom: 18, fontSize: 13, color: "#166534", fontWeight: 700 }}>
                  ✓ OTP Verified for {email}
                </div>

                <FormField label="New Password" error={errors.newPassword}>
                  <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
                    <input
                      className={`fc-input ${errors.newPassword ? "fc-input-error" : ""}`}
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingRight: 40 }}
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
                        padding: 4}}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  {loading ? "Updating Password..." : "Reset Password"}
                </Button>
              </form>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
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

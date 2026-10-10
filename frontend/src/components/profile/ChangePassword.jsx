import { useState, useCallback } from "react";
import { useNotifications } from "../../hooks/useNotifications.js";
import { FormField } from "../common/FormField.jsx";
import { Button } from "../common/Button.jsx";
import { OTPInput } from "../common/OTPInput.jsx";
import { Countdown } from "../common/Countdown.jsx";
import { Lock, AlertTriangle} from "../icons/Icons.jsx";
import { authService } from "../../services/authService.js";
import { useAuth } from "../../hooks/useAuth.js";

export function ChangePassword() {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Step 1: Send OTP after validating current password
  const handleSendOtp = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorText("");
      const valErrors = {};

      if (!currentPassword) {
        valErrors.currentPassword = "Current password is required.";
      }
      if (!newPassword) {
        valErrors.newPassword = "New password is required.";
      } else if (newPassword.length < 6) {
        valErrors.newPassword = "New password must be at least 6 characters.";
      }

      if (newPassword !== confirmPassword) {
        valErrors.confirmPassword = "New passwords do not match.";
      }

      if (Object.keys(valErrors).length > 0) {
        setErrors(valErrors);
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        const token = localStorage.getItem("em_auth_user")
          ? JSON.parse(localStorage.getItem("em_auth_user"))?.token
          : null;

        const res = await authService.changePasswordSendOTP(currentPassword, token);
        setOtpSent(true);
        setDemoOtp(res.debugOtp || "");
        notifySuccess(res.message || "6-digit OTP code sent to your registered email!");
      } catch (err) {
        setErrorText(err.message || "Failed to send OTP code.");
        notifyError(err.message || "Failed to send OTP code.");
      } finally {
        setLoading(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, notifySuccess, notifyError]
  );

  // Step 2: Verify OTP
  const handleVerifyOtp = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: "Please enter the 6-digit OTP code." }));
      return;
    }

    setLoading(true);
    setErrorText("");

    try {
      const token = localStorage.getItem("em_auth_user")
        ? JSON.parse(localStorage.getItem("em_auth_user"))?.token
        : null;

      await authService.changePasswordVerifyOTP(otpCode.trim(), token);
      setOtpVerified(true);
      notifySuccess("OTP Verified! Updating password...");

      // Automatically complete update upon OTP verification
      await authService.changePasswordUpdate(currentPassword, newPassword, otpCode.trim(), token);
      notifySuccess("Password Updated Successfully!");
      
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
    } catch (err) {
      setErrorText(err.message || "OTP verification or password update failed.");
      notifyError(err.message || "Update failed.");
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, otpCode, notifySuccess, notifyError]);

  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        borderRadius: "22px",
        padding: "28px 30px",
        border: "1px solid var(--border, #e2e8f0)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
        marginTop: "24px"}}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.12)",
            color: "var(--brand, #10b981)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"}}
        >
          <Lock size={18} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
            Security & Change Password
          </h3>
          <span style={{ fontSize: 12.5, color: "var(--text-soft)" }}>
            Change your password using Email OTP verification code
          </span>
        </div>
      </div>

      {errorText && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#dc2626",
            padding: "10px 14px",
            borderRadius: "12px",
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600}}
        >
          <AlertTriangle size={18} />
          <span>{errorText}</span>
        </div>
      )}

      <form onSubmit={handleSendOtp}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <FormField label="Current Password" error={errors.currentPassword}>
            <input
              className={`fc-input ${errors.currentPassword ? "fc-input-error" : ""}`}
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={otpSent}
              required
            />
          </FormField>

          <FormField label="New Password" error={errors.newPassword}>
            <input
              className={`fc-input ${errors.newPassword ? "fc-input-error" : ""}`}
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={otpSent}
              required
            />
          </FormField>

          <FormField label="Confirm New Password" error={errors.confirmPassword}>
            <input
              className={`fc-input ${errors.confirmPassword ? "fc-input-error" : ""}`}
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={otpSent}
              required
            />
          </FormField>
        </div>

        {!otpSent ? (
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            style={{ marginTop: 16, borderRadius: "12px", fontWeight: 700 }}
          >
            {loading ? "Validating & Sending OTP..." : "Send Verification OTP to Email"}
          </Button>
        ) : (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.06)",
              border: "1.5px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "16px",
              padding: "20px",
              marginTop: 20}}
          >
            <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--brand)" }}>
                6-Digit Email OTP Verification Code Sent
              </span>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
              >
                Edit Form
              </button>
            </div>

            {demoOtp && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "8px 12px", borderRadius: "8px", fontSize: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Demo OTP: <strong>{demoOtp}</strong></span>
                <button type="button" onClick={() => setOtpCode(demoOtp)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "2px 8px", borderRadius: "4px", fontSize: 11, cursor: "pointer" }}>Auto-fill</button>
              </div>
            )}

            <OTPInput
              value={otpCode}
              onChange={(val) => setOtpCode(val)}
              disabled={loading}
            />

            <Button
              type="button"
              variant="primary"
              disabled={loading || otpCode.length !== 6}
              onClick={handleVerifyOtp}
              style={{ width: "100%", marginTop: 12, borderRadius: "12px", fontWeight: 800 }}
            >
              {loading ? "Verifying & Updating..." : "Verify OTP & Change Password"}
            </Button>

            <Countdown seconds={60} onResend={handleSendOtp} disabled={loading} />
          </div>
        )}
      </form>
    </div>
  );
}

export default ChangePassword;

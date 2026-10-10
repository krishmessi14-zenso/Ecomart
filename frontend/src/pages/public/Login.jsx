import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { Button } from "../../components/common/Button.jsx";
import {
  Sprout,
  AlertTriangle,
  ShieldCheck,
  Check,
  Leaf,
  Globe,
  Award,
  ArrowRight,
  UserCheck,
  ShoppingBag,
  Lock,
  User,
  Eye,
  EyeOff
} from "../../components/icons/Icons.jsx";
import PublicHeader from "../../components/layout/PublicHeader.jsx";

function LoginBase() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const { notifySuccess } = useNotifications();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ensure fields are cleared after browser autofill
  useEffect(() => {
    const timer = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((v) => !v);
  }, []);


  const [isUnverified, setIsUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendVerification = useCallback(async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    try {
      const { authService } = await import("../../services/authService.js");
      const res = await authService.sendOTP(email.trim(), "email_verification");
      notifySuccess(res.message || "Verification OTP sent to your email!");
    } catch (err) {
      setLoginError(err.message || "Failed to resend verification OTP.");
    } finally {
      setResendLoading(false);
    }
  }, [email, notifySuccess]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoginError("");
      setIsUnverified(false);
      const validationErrors = {};

      if (!email.trim()) {
        validationErrors.email = "Please enter your email address.";
      }
      if (!password) {
        validationErrors.password = "Please enter your password.";
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setLoading(true);

      try {
        const authUser = await login(email, password);
        notifySuccess(`Welcome back, ${authUser.name || 'User'}!`);

        if (authUser.role === "vendor") {
          navigate("/vendor/dashboard", { replace: true });
        } else if (authUser.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/customer/marketplace", { replace: true });
        }
      } catch (err) {
        if (err.message?.includes("verify your email") || err.message?.includes("Unverified")) {
          setIsUnverified(true);
          setLoginError("Please verify your email address first before signing in.");
        } else {
          setLoginError(err.message || "Invalid email or password.");
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, login, navigate, notifySuccess]
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
          background: "linear-gradient(135deg, rgba(2, 44, 34, 0.85) 0%, rgba(6, 78, 59, 0.8) 50%, rgba(2, 31, 24, 0.9) 100%), url('/ecomart_bg.jpg') center/cover no-repeat fixed",
          fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
          position: "relative",
          overflow: "hidden"}}
      >
        {/* Animated Background Mesh & Glowing Orbs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "5%",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none"}}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            right: "5%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)",
            filter: "blur(70px)",
            pointerEvents: "none"}}
        />

        {/* Main Innovative Container */}
        <div
          className="fc-slide-up"
          style={{
            maxWidth: "1080px",
            width: "100%",
            borderRadius: "32px",
            background: "rgba(6, 38, 25, 0.75)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            boxShadow: "0 40px 100px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            padding: "36px",
            position: "relative",
            zIndex: 2}}
        >
          {/* Top Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 36,
              paddingBottom: 24,
              borderBottom: "1px solid rgba(255, 255, 255, 0.12)"}}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 6px 18px rgba(16, 185, 129, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.2)"}}
              >
                <Sprout size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                  EcoMart <span style={{ fontSize: 13, fontWeight: 600, color: "#6ee7b7", opacity: 0.9 }}>Portal</span>
                </h3>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Unified B2B & Sustainable Marketplace</span>
              </div>
            </div>

            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#6ee7b7",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "6px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(52, 211, 153, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <ShieldCheck size={16} /> Secure Single Sign-In
            </div>
          </div>

          {/* Grid Layout: Left Live Ecosystem Showcase & Right Glass Login Form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 36,
              alignItems: "center"}}
          >
            {/* Left Column: Innovative Eco-Impact Visualizer */}
            <div style={{ color: "#ffffff", paddingRight: 12 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "rgba(16, 185, 129, 0.18)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  color: "#6ee7b7",
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 20}}
              >
                <Leaf size={14} /> Zero-Carbon Ecosystem
              </div>

              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 34,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  marginBottom: 16,
                  letterSpacing: "-0.03em",
                  background: "linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"}}
              >
                Sustainable Commerce, Redefined.
              </h1>

              <p style={{ fontSize: 14.5, color: "#cbd5e1", lineHeight: 1.65, marginBottom: 28 }}>
                One unified portal for buyers, verified vendors, and platform administrators. Log in with your email to access your personalized portal.
              </p>

              {/* Live Impact Counter Pills */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "18px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)"}}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399", marginBottom: 2 }}>12.8k+ Kg</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>CO₂ Impact Avoided</div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "18px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)"}}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399", marginBottom: 2 }}>100%</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Audited Eco Vendors</div>
                </div>
              </div>
            </div>

            {/* Right Column: High-End Neon Glass Form Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                borderRadius: "24px",
                padding: "40px 36px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
                position: "relative"}}
            >
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", marginBottom: 6 }}>
                  ECOMART ACCOUNT SIGN IN
                </div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, margin: "0 0 6px 0", color: "#0f172a", letterSpacing: "-0.03em" }}>
                  Sign In
                </h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
                  Enter your credentials to access your EcoMart account
                </p>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    color: "#dc2626",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    marginBottom: 20,
                    fontSize: 13.5,
                    fontWeight: 600}}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{loginError}</span>
                  </div>

                  {isUnverified && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      style={{
                        alignSelf: "flex-start",
                        background: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: resendLoading ? "not-allowed" : "pointer",
                        marginTop: 4}}
                    >
                      {resendLoading ? "Sending Verification OTP..." : "Resend Verification OTP"}
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off">
                {/* Email Field */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                    Email Address
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: 14, color: "#10b981", display: "flex", pointerEvents: "none" }}>
                      <User size={18} />
                    </div>
                    <input
                      type="email"
                      name="ecomart_user_email"
                      placeholder="name@company.com"
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: "100%",
                        height: 48,
                        paddingLeft: 42,
                        paddingRight: 16,
                        fontSize: 14.5,
                        borderRadius: "14px",
                        border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                        background: "#f8fafc",
                        color: "#0f172a",
                        outline: "none",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        transition: "all 0.2s ease"}}
                      onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.target.style.borderColor = errors.email ? "#ef4444" : "#cbd5e1")}
                      required
                    />
                  </div>
                  {errors.email && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4, fontWeight: 600 }}>{errors.email}</div>}
                </div>

                {/* Password Field */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                    Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: 14, color: "#10b981", display: "flex", pointerEvents: "none" }}>
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="ecomart_user_password"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: "100%",
                        height: 48,
                        paddingLeft: 42,
                        paddingRight: 46,
                        fontSize: 14.5,
                        borderRadius: "14px",
                        border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                        background: "#f8fafc",
                        color: "#0f172a",
                        outline: "none",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        transition: "all 0.2s ease"}}
                      onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.target.style.borderColor = errors.password ? "#ef4444" : "#cbd5e1")}
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
                        color: "#64748b",
                        display: "flex",
                        padding: 6}}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4, fontWeight: 600 }}>{errors.password}</div>}
                </div>

                {/* Remember & Forgot Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, fontSize: 13.5 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#475569", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: "#10b981", width: 17, height: 17, cursor: "pointer" }}
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit CTA */}
                <Button
                  type="submit"
                  variant="primary"
                  full
                  disabled={loading}
                  style={{
                    height: 50,
                    borderRadius: "14px",
                    fontWeight: 800,
                    fontSize: 15.5,
                    letterSpacing: "-0.01em",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                    border: "none",
                    color: "#ffffff",
                    boxShadow: "0 8px 24px rgba(16, 185, 129, 0.4)",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8}}
                >
                  {loading ? (
                    "Signing in..."
                  ) : (
                    <>
                      Sign In to EcoMart <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </form>

              {/* Create Account Link */}
              <div style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "#64748b" }}>
                Don't have an account?{" "}
                <Link to="/register" style={{ fontWeight: 800, color: "#059669", textDecoration: "none" }}>
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const Login = memo(LoginBase);
export default Login;

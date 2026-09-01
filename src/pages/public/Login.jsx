import { useState, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Sprout, AlertTriangle, ShieldCheck } from "../../components/icons/Icons.jsx";
import PublicHeader from "../../components/layout/PublicHeader.jsx";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
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

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((v) => !v);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoginError("");
      const validationErrors = {};

      if (!email.trim()) {
        validationErrors.email = "Please enter your email.";
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
        notifySuccess(`Welcome back, ${authUser.name}!`);

        if (authUser.role === "vendor") {
          navigate("/vendor/dashboard", { replace: true });
        } else if (authUser.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/customer/dashboard", { replace: true });
        }
      } catch (err) {
        setLoginError(err.message || "Invalid email or password.");
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
          background: "linear-gradient(rgba(5, 45, 24, 0.60), rgba(5, 25, 14, 0.72)), url('/images/ecomart-hero.jpg') center/cover no-repeat fixed",
        }}
      >
        <div
          className="fc-slide-up"
          style={{
            maxWidth: "960px",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {/* Left Side: Brand Visual */}
          <div
            style={{
              background: "linear-gradient(rgba(10, 32, 18, 0.82), rgba(5, 19, 11, 0.92)), url('/images/ecomart-hero.jpg') center/cover no-repeat",
              padding: "44px 36px",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                    color: "#ffffff",
                  }}
                >
                  <Sprout size={22} />
                </div>
                <div>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 800, margin: 0 }}>
                    EcoMart
                  </h2>
                  <span style={{ fontSize: 11, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Sustainable Marketplace
                  </span>
                </div>
              </div>

              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 800, lineHeight: 1.25, marginBottom: 16 }}>
                Welcome Back to EcoMart
              </h1>
              <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5, marginBottom: 28 }}>
                Sign in to access your account dashboard, track orders, manage products, or oversee platform activities.
              </p>

              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(6px)",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 6 }}>
                  <ShieldCheck size={16} /> Automated Role Routing
                </div>
                Enter your email and password. Our system automatically directs Customers, Vendors, and Admins to their respective portals.
              </div>
            </div>

            <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 12, opacity: 0.85 }}>
              © 2026 EcoMart. Sustainable Products Marketplace.
            </div>
          </div>

          {/* Right Side: Authentication Form */}
          <div style={{ padding: "40px 36px", background: "var(--surface)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "var(--text)" }}>
                Sign In
              </h2>
              <p className="fc-muted" style={{ fontSize: 13.5, margin: "0 0 20px 0" }}>
                Access your EcoMart account
              </p>
            </div>

            {/* Error Alert */}
            {loginError && (
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
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <FormField label="Email Address" error={errors.email}>
                <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 12, color: "var(--text-soft)", display: "flex" }}>
                    <UserIcon />
                  </div>
                  <input
                    className={`fc-input ${errors.email ? "fc-input-error" : ""}`}
                    type="email"
                    placeholder="Enter your email address"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: 36 }}
                    required
                  />
                </div>
              </FormField>

              {/* Password Input */}
              <FormField label="Password" error={errors.password}>
                <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 12, color: "var(--text-soft)", display: "flex" }}>
                    <LockIcon />
                  </div>
                  <input
                    className={`fc-input ${errors.password ? "fc-input-error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {/* Remember Me & Forgot Password Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, fontSize: 12.5 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: "var(--brand)" }}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "underline" }}>
                  Forgot Password?
                </Link>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                full
                disabled={loading}
                style={{ padding: "12px", fontWeight: 700 }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Register Redirect */}
            <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--text-soft)" }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ fontWeight: 700, color: "var(--brand)", textDecoration: "underline" }}>
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const Login = memo(LoginBase);
export default Login;

import { useState, useRef, useEffect, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sprout, Sun, Moon } from "../icons/Icons.jsx";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useTheme } from "../../hooks/useTheme.js";
import { LANGUAGES } from "../../context/LanguageContext.jsx";

function PublicHeaderBase() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/register";

  return (
    <header className="fc-navbar" style={{
      position: "sticky",
      top: 0,
      width: "100%",
      zIndex: 100,
      background: "var(--glass-bg)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 24px",
      height: "64px",
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
    }}>
      {/* Brand logo */}
      <div className="fc-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <div className="fc-brand-icon"><Sprout size={16} /></div>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "19px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>EcoMart</span>
      </div>

      {/* Action buttons + Language + Theme switcher */}
      <div className="fc-navbar-right" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {/* Language selector */}
        <div className="fc-dropdown-wrap" ref={langRef} style={{ position: "relative" }}>
          <button className="fc-btn fc-btn-outline fc-btn-sm" onClick={() => setLangOpen((s) => !s)} aria-label="language" style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13.5px",
            fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            padding: "7px 14px",
            borderRadius: "10px",
            letterSpacing: "-0.01em"}}>
            <span>🌐</span>
            <span>{LANGUAGES.find((l) => l.code === lang)?.label || "English"}</span>
            <span style={{ fontSize: "10px", opacity: 0.8 }}>▼</span>
          </button>
          {langOpen && (
            <div className="fc-dropdown fc-lang-menu fc-slide-down" style={{
              position: "absolute",
              top: "110%",
              right: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
              borderRadius: "12px",
              minWidth: "150px",
              padding: "6px 0",
              zIndex: 100,
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`fc-lang-item ${lang === l.code ? "active" : ""}`}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    fontWeight: lang === l.code ? 700 : 500,
                    fontSize: "13px"
                  }}
                >
                  <span style={{ width: "16px", color: "var(--brand)", fontWeight: "bold" }}>
                    {lang === l.code ? "✓" : ""}
                  </span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="fc-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark Mode" : "Light Mode"}
          style={{ borderRadius: "10px", width: "38px", height: "38px" }}
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* Home / Login / Register buttons */}
        {!isLoginPage && (
          <button
            className="fc-btn fc-btn-outline fc-btn-sm"
            onClick={() => navigate("/login")}
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "13.5px",
              padding: "7px 16px",
              borderRadius: "10px",
              letterSpacing: "-0.01em"
            }}
          >
            Sign In
          </button>
        )}
        {!isRegisterPage && (
          <button
            className="fc-btn fc-btn-primary fc-btn-sm"
            onClick={() => navigate("/register")}
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "13.5px",
              padding: "7px 18px",
              borderRadius: "10px",
              letterSpacing: "-0.01em",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
            }}
          >
            Register
          </button>
        )}
      </div>
    </header>
  );
}

export const PublicHeader = memo(PublicHeaderBase);
export default PublicHeader;

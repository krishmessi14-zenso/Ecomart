import { useState, useRef, useEffect, useCallback, memo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Sprout, Bell, Cart, Moon, Sun, Menu} from "../icons/Icons.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "../../hooks/useTheme.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useCart } from "../../hooks/useCart.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { LANGUAGES } from "../../context/LanguageContext.jsx";
import { formatDate } from "../../utils/formatters.js";

const VENDOR_NAV = [
  { path: "/vendor/dashboard", key: "navigation.overview", defaultLabel: "Overview" },
  { path: "/vendor/products", key: "navigation.myProducts", defaultLabel: "My Products" },
  { path: "/vendor/orders", key: "navigation.orders", defaultLabel: "Orders" },
];
const CUSTOMER_NAV = [
  { path: "/customer/dashboard", key: "navigation.overview", defaultLabel: "Overview" },
  { path: "/customer/marketplace", key: "navigation.marketplace", defaultLabel: "Marketplace" },
  { path: "/customer/orders", key: "navigation.orders", defaultLabel: "Orders" },
];
const ADMIN_NAV = [
  { path: "/admin/dashboard", key: "navigation.overview", defaultLabel: "Overview" },
  { path: "/admin/users", key: "navigation.users", defaultLabel: "Users" },
  { path: "/admin/orders", key: "navigation.orders", defaultLabel: "Orders" },
];

function NavbarBase({ onOpenMobileSidebar }) {
  const { role, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { cart } = useCart();
  const { notifications, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const langRef = useRef(null);
  const userRef = useRef(null);

  const unread = notifications.filter((n) => !n.read).length;
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const nav = role === "admin" ? ADMIN_NAV : (role === "vendor" ? VENDOR_NAV : CUSTOMER_NAV);

  useEffect(() => {
    function onClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleToggleNotif = useCallback(() => {
    setNotifOpen((s) => {
      const next = !s;
      if (next) markAllRead();
      return next;
    });
  }, [markAllRead]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const roleLabel = role === "vendor" ? "Vendor" : (role === "admin" ? "Admin" : "Customer");
  const roleBadgeClass = role === "vendor" ? "fc-role-badge-vendor" : (role === "admin" ? "fc-role-badge-admin" : "fc-role-badge-customer");

  return (
    <header className="fc-navbar">
      <button className="fc-icon-btn fc-mobile-sidebar-toggle" onClick={onOpenMobileSidebar} aria-label="Open navigation menu">
        <Menu size={20} />
      </button>

      <div
        className="fc-brand"
        onClick={() => navigate(role === "vendor" ? "/vendor/dashboard" : (role === "customer" ? "/customer/dashboard" : "/admin/dashboard"))}
        role="button"
        tabIndex={0}
        aria-label="EcoMart home"
      >
        <div className="fc-brand-icon"><Sprout size={16} /></div>
        <span>EcoMart</span>
      </div>

      <nav className="fc-navlinks">
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `fc-navlink ${isActive ? "active" : ""}`}
          >
            {t(item.key, item.defaultLabel) || item.defaultLabel}
          </NavLink>
        ))}
      </nav>

      <div className="fc-navbar-right">
        {/* Role Badge */}
        <span className={`fc-role-badge ${roleBadgeClass}`}>
          {roleLabel}
        </span>

        {/* Language Selector */}
        <div className="fc-dropdown-wrap" ref={langRef}>
          <button
            className="fc-btn fc-btn-outline fc-btn-sm"
            onClick={() => setLangOpen((s) => !s)}
            aria-label="Change language"
            aria-expanded={langOpen}
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "13.5px",
              padding: "7px 14px",
              borderRadius: "10px",
              letterSpacing: "-0.01em"}}
          >
            <span>🌐</span>
            <span>{LANGUAGES.find((l) => l.code === lang)?.label || "English"}</span>
            <span style={{ fontSize: "10px", opacity: 0.8 }}>▼</span>
          </button>
          {langOpen && (
            <div className="fc-dropdown fc-lang-menu fc-slide-down" style={{ padding: "6px 0", borderRadius: "12px", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`fc-lang-item ${lang === l.code ? "active" : ""}`}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: lang === l.code ? 700 : 500 }}
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
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* Cart (Customer only) */}
        {role === "customer" && (
          <button className="fc-icon-btn" onClick={() => navigate("/customer/cart")} aria-label="Shopping cart">
            <Cart size={17} />
            {cartCount > 0 && <span className="fc-badge-dot">{cartCount}</span>}
          </button>
        )}

        {/* Notifications */}
        <div className="fc-dropdown-wrap" ref={notifRef}>
          <button className="fc-icon-btn" onClick={handleToggleNotif} aria-label="Notifications" aria-expanded={notifOpen}>
            <Bell size={17} />
            {unread > 0 && <span className="fc-badge-dot">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="fc-dropdown fc-slide-down">
              <div className="fc-dropdown-header">
                <strong style={{ fontSize: "var(--text-base)" }}>Notifications</strong>
              </div>
              <div className="fc-notif-list">
                {notifications.length === 0 ? (
                  <div className="fc-notif-empty">You're all caught up.</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className={`fc-notif-item ${!n.read ? "unread" : ""}`}>
                      <span className="fc-notif-dot" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ lineHeight: 1.4 }}>{n.text}</div>
                        <div className="fc-soft" style={{ marginTop: 3 }}>{formatDate(n.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="fc-dropdown-wrap" ref={userRef}>
          <button
            className="fc-btn fc-btn-outline fc-btn-sm"
            onClick={() => setUserMenuOpen(s => !s)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            {user?.name?.split(" ")[0] || "Account"}
            <span style={{ fontSize: "10px" }}>▼</span>
          </button>
          {userMenuOpen && (
            <div className="fc-dropdown fc-slide-down" style={{ width: "180px", padding: "4px 0" }}>
              <button className="fc-lang-item" onClick={() => { navigate(`/${role || "customer"}/profile`); setUserMenuOpen(false); }}>
                Profile
              </button>
              <button className="fc-lang-item" onClick={() => { navigate("/support"); setUserMenuOpen(false); }}>
                Help & Support
              </button>
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
              <button className="fc-lang-item" onClick={handleLogout} style={{ color: "var(--danger)" }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export const Navbar = memo(NavbarBase);
export default Navbar;

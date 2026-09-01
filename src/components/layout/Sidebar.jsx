import { memo } from "react";
import { NavLink } from "react-router-dom";
import {
  ClipboardList, Package, ShoppingBag, Heart, Cart as CartIcon, Truck,
} from "../icons/Icons.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";

const LayoutGrid = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const UserIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShieldIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const VENDOR_LINKS = [
  { path: "/vendor/dashboard", key: "navigation.overview", defaultLabel: "Overview", icon: LayoutGrid },
  { path: "/vendor/store", key: "navigation.myStore", defaultLabel: "My Store", icon: Package },
  { path: "/vendor/products", key: "navigation.myProducts", defaultLabel: "My Products", icon: ShoppingBag },
  { path: "/vendor/orders", key: "navigation.orders", defaultLabel: "Orders", icon: Truck },
  { path: "/vendor/profile", key: "navigation.profile", defaultLabel: "Profile", icon: UserIcon },
];

const CUSTOMER_LINKS = [
  { path: "/customer/dashboard", key: "navigation.ecoDashboard", defaultLabel: "Eco Dashboard", icon: LayoutGrid },
  { path: "/customer/marketplace", key: "navigation.marketplace", defaultLabel: "Marketplace", icon: ShoppingBag },
  { path: "/customer/orders", key: "navigation.orders", defaultLabel: "Orders", icon: ClipboardList },
  { path: "/customer/wishlist", key: "navigation.wishlist", defaultLabel: "Wishlist", icon: Heart },
  { path: "/customer/cart", key: "navigation.cart", defaultLabel: "Cart", icon: CartIcon },
  { path: "/customer/profile", key: "navigation.profile", defaultLabel: "Profile", icon: UserIcon },
];

const ADMIN_LINKS = [
  { path: "/admin/dashboard", key: "navigation.overview", defaultLabel: "Overview", icon: LayoutGrid },
  { path: "/admin/users", key: "navigation.users", defaultLabel: "Users", icon: UserIcon },
  { path: "/admin/vendors", key: "navigation.verification", defaultLabel: "Verification", icon: ShieldIcon },
  { path: "/admin/products", key: "navigation.harvests", defaultLabel: "Products", icon: Package },
  { path: "/admin/orders", key: "navigation.orders", defaultLabel: "Orders", icon: Truck },
  { path: "/admin/profile", key: "navigation.profile", defaultLabel: "Profile", icon: UserIcon },
];

function SidebarBase({ mobileOpen, onCloseMobile }) {
  const { role, logout } = useAuth();
  const { t } = useLanguage();
  const links = role === "admin" ? ADMIN_LINKS : (role === "vendor" ? VENDOR_LINKS : CUSTOMER_LINKS);

  const roleLabel = role === "admin" ? t("admin.adminProfile") || "Admin" : (role === "vendor" ? t("common.vendor") || "Vendor" : t("common.customer") || "Customer");

  const handleLogout = () => {
    logout();
    onCloseMobile?.();
  };

  const content = (
    <>
      <div className="fc-side-section-title">
        {roleLabel}
      </div>
      {links.map((l) => {
        const Icon = l.icon;
        const translatedLabel = t(l.key) || l.defaultLabel;
        return (
          <NavLink
            key={l.path}
            to={l.path}
            className={({ isActive }) => `fc-side-link ${isActive ? "active" : ""}`}
            onClick={onCloseMobile}
          >
            <Icon size={16} /> {translatedLabel}
          </NavLink>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <button
          className="fc-side-link"
          onClick={handleLogout}
          style={{ width: "100%", justifyContent: "flex-start", cursor: "pointer", background: "none", border: "none", color: "var(--danger)" }}
        >
          {t("common.logout") || "Sign Out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fc-sidebar fc-desktop-only">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fc-modal-overlay" onClick={onCloseMobile} style={{ zIndex: 110 }}>
          <aside className="fc-sidebar fc-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span className="fc-h3" style={{ fontSize: 16 }}>Menu</span>
              <button className="fc-icon-btn" onClick={onCloseMobile}><X size={18} /></button>
            </div>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

export const Sidebar = memo(SidebarBase);
export default Sidebar;

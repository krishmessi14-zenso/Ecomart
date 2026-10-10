import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { LoadingState } from "../components/common/LoadingState.jsx";

// Layout components (loaded synchronously for shell stability)
import Navbar from "../components/layout/Navbar.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import Footer from "../components/layout/Footer.jsx";
import OfferToast from "../components/common/OfferToast.jsx";

// Lazy-loaded page components for optimal bundle splitting
const LandingPage = lazy(() => import("../pages/public/LandingPage.jsx"));
const Login = lazy(() => import("../pages/public/Login.jsx"));
const Register = lazy(() => import("../pages/public/Register.jsx"));
const ForgotPassword = lazy(() => import("../pages/public/ForgotPassword.jsx"));
const Support = lazy(() => import("../pages/public/Support.jsx"));
const VendorProfile = lazy(() => import("../pages/public/VendorProfile.jsx"));

const VendorDashboard = lazy(() => import("../pages/vendor/VendorDashboard.jsx"));
const MyStore = lazy(() => import("../pages/vendor/MyStore.jsx"));
const MyProducts = lazy(() => import("../pages/vendor/MyProducts.jsx"));
const MyOffers = lazy(() => import("../pages/vendor/MyOffers.jsx"));
const VendorOrders = lazy(() => import("../pages/vendor/VendorOrders.jsx"));

const CustomerDashboard = lazy(() => import("../pages/customer/CustomerDashboard.jsx"));
const Marketplace = lazy(() => import("../pages/customer/Marketplace.jsx"));
const ProductDetails = lazy(() => import("../pages/customer/ProductDetails.jsx"));
const Wishlist = lazy(() => import("../pages/customer/Wishlist.jsx"));
const CartPage = lazy(() => import("../pages/customer/CartPage.jsx"));
const Checkout = lazy(() => import("../pages/customer/Checkout.jsx"));
const OrderHistory = lazy(() => import("../pages/customer/OrderHistory.jsx"));
const OrderTracking = lazy(() => import("../pages/customer/OrderTracking.jsx"));
const ScanProduct = lazy(() => import("../pages/customer/ScanProduct.jsx"));
const MyImpact = lazy(() => import("../pages/customer/MyImpact.jsx"));
const OffersPage = lazy(() => import("../pages/customer/OffersPage.jsx"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard.jsx"));
const OfferApprovals = lazy(() => import("../pages/admin/OfferApprovals.jsx"));
const ProfileSettings = lazy(() => import("../pages/common/ProfileSettings.jsx"));
const NotFound = lazy(() => import("../pages/public/NotFound.jsx"));

function SuspenseFallback() {
  return (
    <div style={{ padding: "60px 0" }}>
      <LoadingState text="Loading page module..." />
    </div>
  );
}

// Layout shell that coordinates Navbar, Sidebar, and page content
function LayoutShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="fc-app animate-fade-in">
      <Navbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
      <div className="fc-shell">
        <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        <main className="fc-main">
          <Suspense fallback={<SuspenseFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <OfferToast />
      <Footer />
    </div>
  );
}

// Public Route guard
function PublicRoute() {
  const { role, isAuthenticated } = useAuth();
  if (isAuthenticated && role === "vendor") return <Navigate to="/vendor/dashboard" replace />;
  if (isAuthenticated && role === "customer") return <Navigate to="/customer/dashboard" replace />;
  if (isAuthenticated && role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <LandingPage />
    </Suspense>
  );
}

// Login Route guard
function LoginRoute() {
  const { role, isAuthenticated } = useAuth();
  if (isAuthenticated && role === "vendor") return <Navigate to="/vendor/dashboard" replace />;
  if (isAuthenticated && role === "customer") return <Navigate to="/customer/dashboard" replace />;
  if (isAuthenticated && role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Login />
    </Suspense>
  );
}

// Register Route guard
function RegisterRoute() {
  const { role, isAuthenticated } = useAuth();
  if (isAuthenticated && role === "vendor") return <Navigate to="/vendor/dashboard" replace />;
  if (isAuthenticated && role === "customer") return <Navigate to="/customer/dashboard" replace />;
  if (isAuthenticated && role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Register />
    </Suspense>
  );
}

// Forgot Password Route guard
function ForgotPasswordRoute() {
  const { role, isAuthenticated } = useAuth();
  if (isAuthenticated && role === "vendor") return <Navigate to="/vendor/dashboard" replace />;
  if (isAuthenticated && role === "customer") return <Navigate to="/customer/dashboard" replace />;
  if (isAuthenticated && role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <ForgotPassword />
    </Suspense>
  );
}

// Guard for role-specific routes
function RoleGuard({ allowedRole }) {
  const { user, role, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== allowedRole) {
    const dest =
      role === "vendor"
        ? "/vendor/dashboard"
        : role === "customer"
        ? "/customer/dashboard"
        : role === "admin"
        ? "/admin/dashboard"
        : "/login";
    return <Navigate to={dest} replace />;
  }

  return <LayoutShell />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<PublicRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
      <Route
        path="/support"
        element={
          <Suspense fallback={<SuspenseFallback />}>
            <Support />
          </Suspense>
        }
      />
      <Route
        path="/vendor-profile/:vendorId"
        element={
          <Suspense fallback={<SuspenseFallback />}>
            <VendorProfile />
          </Suspense>
        }
      />

      {/* Vendor Pages */}
      <Route path="/vendor" element={<RoleGuard allowedRole="vendor" />}>
        <Route index element={<Navigate to="/vendor/dashboard" replace />} />
        <Route path="dashboard" element={<VendorDashboard />} />
        <Route path="store" element={<MyStore />} />
        <Route path="products" element={<MyProducts />} />
        <Route path="products/add" element={<MyProducts openAdd={true} />} />
        <Route path="offers" element={<MyOffers />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="orders/:orderId" element={<VendorOrders />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* Customer Pages */}
      <Route path="/customer" element={<RoleGuard allowedRole="customer" />}>
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="products/:productId" element={<ProductDetails />} />
        <Route path="vendor-profile/:vendorId" element={<VendorProfile />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<OrderHistory />} />
        <Route path="orders/:orderId" element={<OrderHistory />} />
        <Route path="tracking" element={<OrderTracking />} />
        <Route path="tracking/:orderId" element={<OrderTracking />} />
        <Route path="scan" element={<ScanProduct />} />
        <Route path="impact" element={<MyImpact />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* Admin Pages */}
      <Route path="/admin" element={<RoleGuard allowedRole="admin" />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminDashboard />} />
        <Route path="vendors" element={<AdminDashboard />} />
        <Route path="customers" element={<AdminDashboard />} />
        <Route path="products" element={<AdminDashboard />} />
        <Route path="orders" element={<AdminDashboard />} />
        <Route path="reviews" element={<AdminDashboard />} />
        <Route path="offers" element={<OfferApprovals />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <Suspense fallback={<SuspenseFallback />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}

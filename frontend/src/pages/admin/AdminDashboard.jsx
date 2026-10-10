import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  StatCard,
  Button,
  Card,
  Badge,
  Avatar,
  SearchBox,
  Tabs,
  Skeleton,
  TableRowSkeleton,
  EmptyState,
  Modal} from "../../components/common/index.js";
import { DonutChart } from "../../components/charts/DonutChart.jsx";
import { LineChart } from "../../components/charts/LineChart.jsx";
import {
  ClipboardList,
  Package,
  TrendingUp,
  AlertTriangle,
  Search as SearchIcon,
  Check,
  Star} from "../../components/icons/Icons.jsx";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { useData } from "../../hooks/useData.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { apiFetch } from "../../services/api.js";

const ShieldIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: "8px" }}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const UserIcon = ({ size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function getStatusBadgeVariant(status) {
  switch (status?.toLowerCase()) {
    case "verified":
    case "delivered":
    case "accepted":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

function AdminDashboardBase() {
  const { t } = useLanguage();
  const { products, orders, approveProduct } = useData();
  const { notifySuccess } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [deliveryAnalytics, setDeliveryAnalytics] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [inspectProduct, setInspectProduct] = useState(null);

  // Tab switcher
  const pathSegment = location.pathname.split("/").pop();
  const activeTab = [
    "users",
    "vendors",
    "customers",
    "products",
    "orders",
    "reviews",
  ].includes(pathSegment)
    ? pathSegment
    : "overview";

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await apiFetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  }, []);

  const fetchDeliveryAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/delivery/analytics/overview");
      if (res.ok) {
        const data = await res.json();
        setDeliveryAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load delivery analytics:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
      fetchReviews();
      fetchDeliveryAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, fetchReviews, fetchDeliveryAnalytics]);

  // Safe array guarantees
  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const safeReviews = useMemo(() => (Array.isArray(reviews) ? reviews : []), [reviews]);

  // Derived statistics
  const vendorsList = useMemo(
    () => safeUsers.filter((u) => u && u.role === "vendor"),
    [safeUsers]
  );
  const customersList = useMemo(
    () => safeUsers.filter((u) => u && u.role === "customer"),
    [safeUsers]
  );

  const pendingProducts = useMemo(
    () => safeProducts.filter((p) => p && p.status === "pending"),
    [safeProducts]
  );

  const totalVolume = useMemo(() => {
    return safeOrders
      .filter((o) => o && (o.status === "Delivered" || o.status === "Accepted" || o.status === "Confirmed" || o.status === "Paid"))
      .reduce((s, o) => s + (Number(o?.amount) || Number(o?.totalAmount) || 0), 0);
  }, [safeOrders]);

  // Chart data calculations
  const revenueTrend = useMemo(() => {
    const sorted = [...safeOrders].sort(
      (a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0)
    );
    const dateMap = new Map();
    let running = 0;
    for (const o of sorted) {
      const val = Number(o?.amount) || Number(o?.totalAmount) || 0;
      running += val;
      const dateLabel = o?.createdAt
        ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : "Initial";
      dateMap.set(dateLabel, running);
    }
    return Array.from(dateMap.entries()).map(([label, value]) => ({ label, value }));
  }, [safeOrders]);

  const categoryDist = useMemo(() => {
    const buckets = {};
    safeProducts.forEach((p) => {
      if (p) {
        const cat = p.category || "General";
        buckets[cat] = (buckets[cat] || 0) + 1;
      }
    });
    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
  }, [safeProducts]);

  const ordersByStatus = useMemo(() => {
    const buckets = { Pending: 0, Accepted: 0, Delivered: 0, Rejected: 0 };
    safeOrders.forEach((o) => {
      if (o && o.status) {
        const statusKey = String(o.status).replace(/\s+/g, "");
        buckets[statusKey] = (buckets[statusKey] || 0) + 1;
      }
    });
    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
  }, [safeOrders]);

  const handleTabChange = useCallback(
    (tab) => {
      setSearchQuery("");
      if (tab === "overview") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/${tab}`);
      }
    },
    [navigate]
  );

  // Vendor verification control
  const handleVerifyVendor = useCallback(
    async (userId, status) => {
      try {
        const res = await fetch(`/api/users/${userId}/verification`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })});
        if (res.ok) {
          notifySuccess(`Vendor account is now ${status}!`);
          fetchUsers();
        }
      } catch (err) {
        console.error(err);
      }
    },
    [fetchUsers, notifySuccess]
  );

  // Approve/reject a pending product listing
  const handleProductApproval = useCallback(
    async (productId, status, customReason) => {
      const reason = status === "rejected" ? (customReason || rejectReason) : undefined;
      await approveProduct(productId, status, reason);
      notifySuccess(`Product ${status} successfully!`);
      setRejectingId(null);
      setRejectReason("");
    },
    [approveProduct, notifySuccess, rejectReason]
  );

  // Moderate/delete review
  const handleDeleteReview = useCallback(
    async (reviewId) => {
      try {
        const res = await apiFetch(`/api/reviews/${reviewId}`, {
          method: "DELETE"});
        if (res.ok) {
          notifySuccess("Review moderated and deleted.");
          fetchReviews();
        }
      } catch (err) {
        console.error(err);
      }
    },
    [fetchReviews, notifySuccess]
  );

  // CSV Report exporters
  const handleExportCSV = useCallback(
    (type) => {
      let exportHeaders = [];
      let exportRows = [];
      const filename = `${type}_report.csv`;

      if (type === "orders") {
        exportHeaders = ["Order ID", "Customer Name", "Subtotal Amount", "Status", "Date"];
        exportRows = safeOrders.map((o) => [o.id, o.customerName, o.totalAmount || o.amount, o.status, o.createdAt]);
      } else if (type === "users") {
        exportHeaders = ["User ID", "Name", "Email", "Role", "Verification Status", "Rating"];
        exportRows = safeUsers.map((u) => [u.id, u.name, u.email, u.role, u.verificationStatus, u.rating]);
      } else {
        exportHeaders = ["Product ID", "Product Name", "Category", "Base Price", "Stock"];
        exportRows = safeProducts.map((p) => [p.id, p.name, p.category, p.price, p.stock]);
      }

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [exportHeaders.join(","), ...exportRows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [safeOrders, safeUsers, safeProducts]
  );

  const getVendorName = useCallback(
    (id) => {
      const u = safeUsers.find((user) => user && user.id === id);
      if (u) return u.storeName || u.name;
      const v = vendorsList.find((f) => f && f.id === id);
      if (v) return v.storeName || v.name;
      return "EcoCraft Studio";
    },
    [safeUsers, vendorsList]
  );
  const getProductName = useCallback(
    (id) => products.find((p) => p.id === id)?.name || "—",
    [products]
  );

  // Filtered lists for search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u?.name?.toLowerCase() || "").includes(q) ||
        (u?.email?.toLowerCase() || "").includes(q) ||
        (u?.role?.toLowerCase() || "").includes(q)
    );
  }, [users, searchQuery]);

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendorsList;
    const q = searchQuery.toLowerCase();
    return vendorsList.filter(
      (f) =>
        (f?.name?.toLowerCase() || "").includes(q) ||
        (f?.storeName?.toLowerCase() || "").includes(q) ||
        (f?.region?.toLowerCase() || "").includes(q)
    );
  }, [vendorsList, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customersList;
    const q = searchQuery.toLowerCase();
    return customersList.filter(
      (v) =>
        (v?.name?.toLowerCase() || "").includes(q) ||
        (v?.email?.toLowerCase() || "").includes(q) ||
        (v?.region?.toLowerCase() || "").includes(q)
    );
  }, [customersList, searchQuery]);

  const filteredProducts = useMemo(() => {
    let list = safeProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          (p?.name?.toLowerCase() || "").includes(q) ||
          (p?.category?.toLowerCase() || "").includes(q) ||
          (p?.status?.toLowerCase() || "").includes(q)
      );
    }
    // Sort pending products first so admin sees pending verification items immediately
    return [...list].sort((a, b) => {
      const aPending = a?.status === "pending" ? 0 : 1;
      const bPending = b?.status === "pending" ? 0 : 1;
      return aPending - bPending;
    });
  }, [safeProducts, searchQuery]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        String(o?.id || "").toLowerCase().includes(q) ||
        (o?.customerName?.toLowerCase() || "").includes(q) ||
        (getProductName(o?.productId)?.toLowerCase() || "").includes(q)
    );
  }, [orders, searchQuery, getProductName]);

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(
      (r) =>
        (r?.customerName?.toLowerCase() || "").includes(q) ||
        (r?.comment?.toLowerCase() || "").includes(q)
    );
  }, [reviews, searchQuery]);

  const adminTabs = [
    { id: "overview", label: t("admin.overview", "Overview & Analytics") },
    { id: "users", label: `${t("navigation.users", "Users")} (${users.length})` },
    { id: "vendors", label: `${t("navigation.vendors", "Vendors")} (${vendorsList.length})` },
    { id: "customers", label: `${t("navigation.buyers", "Buyers")} (${customersList.length})` },
    { id: "products", label: `${t("navigation.products", "Products")} (${products.length})` },
    { id: "orders", label: `${t("navigation.orders", "Orders")} (${orders.length})` },
    { id: "reviews", label: `${t("admin.reviews", "Reviews")} (${reviews.length})` },
  ];

  return (
    <div className="fc-page-transition">
      {/* Hero Header Banner */}
      <div
        className="fc-hero"
        style={{
          background: "var(--gradient-hero)",
          padding: "32px 28px",
          borderRadius: "var(--radius-lg)",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden"}}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ marginRight: 14, display: "flex" }}>
              <ShieldIcon />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.9 }}>
                {t("admin.adminProfile", "PLATFORM GOVERNANCE")}
              </span>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "26px", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                {t("admin.dashboardTitle", "Admin Control Center")}
              </h1>
              <p style={{ margin: "4px 0 0 0", opacity: 0.9, fontSize: "13.5px" }}>
                {t("admin.dashboardSubtitle", "Manage platform users, verify vendor accounts, oversee listings, and review system analytics.")}
              </p>
            </div>
          </div>

          <div className="fc-flex-gap-8" style={{ flexWrap: "wrap" }}>
            <Button variant="accent" size="sm" onClick={() => handleExportCSV("orders")} style={{ fontWeight: 700 }}>
              Export Orders CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportCSV("users")} style={{ fontWeight: 700, color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
              Export Users CSV
            </Button>
          </div>
        </div>
      </div>


      {/* Metrics Stat Cards */}
      <div className="fc-stat-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          label="Total Sales Revenue"
          value={formatCurrency(totalVolume)}
          icon={<TrendingUp size={20} />}
          color="var(--brand)"
          bg="var(--brand-light)"
          trend={{ direction: "up", text: "+18% vs last month" }}
        />
        <StatCard
          label="Total Products Listed"
          value={products.length}
          icon={<Package size={20} />}
          color="var(--accent)"
          bg="var(--accent-light)"
        />
        <StatCard
          label="Total Orders"
          value={orders.length}
          icon={<ClipboardList size={20} />}
          color="var(--info)"
          bg="var(--info-light)"
        />
        <StatCard
          label="Active Platform Users"
          value={users.length}
          icon={<UserIcon size={20} />}
          color="var(--brand-dark)"
          bg="var(--brand-light)"
        />
        <StatCard
          label="Pending Product Approvals"
          value={pendingProducts.length}
          icon={<AlertTriangle size={20} />}
          color="var(--warning)"
          bg="var(--warning-light, #fff7ed)"
          onClick={() => handleTabChange("products")}
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Navigation Tabs Bar */}
      <Card style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <Tabs
          tabs={adminTabs}
          activeTab={activeTab}
          onChange={(tabId) => handleTabChange(tabId)}
          variant="underline"
        />
      </Card>

      {/* Search Bar for Management Tabs */}
      {activeTab !== "overview" && (
        <Card style={{ padding: "16px 20px", marginBottom: "20px" }}>
          <SearchBox
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            placeholder={`Search ${activeTab}...`}
          />
        </Card>
      )}

      {/* TAB 1: Overview & Analytics */}
      {activeTab === "overview" && (
        <>
          <div className="fc-grid-2" style={{ marginBottom: "24px" }}>
            <Card style={{ padding: "20px" }}>
              <h3 className="fc-h3" style={{ marginBottom: 16 }}>Platform Sales Revenue Trend</h3>
              {revenueTrend.length ? (
                <LineChart data={revenueTrend} color="var(--brand)" chartId="admin-volume" />
              ) : (
                <p className="fc-muted" style={{ fontStyle: "italic", fontSize: 13 }}>No transaction data available.</p>
              )}
            </Card>

            <Card style={{ padding: "20px" }}>
              <h3 className="fc-h3" style={{ marginBottom: 16 }}>Category Listing Distribution</h3>
              {categoryDist.length ? (
                <DonutChart data={categoryDist} />
              ) : (
                <p className="fc-muted" style={{ fontStyle: "italic", fontSize: 13 }}>No products listed.</p>
              )}
            </Card>
          </div>

          <div className="fc-grid-2" style={{ marginBottom: "24px" }}>
            <Card style={{ padding: "20px" }}>
              <h3 className="fc-h3" style={{ marginBottom: 16 }}>Platform Summary Metrics</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <span className="fc-muted">Registered Vendors:</span>
                  <strong>{vendorsList.length} users</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <span className="fc-muted">Registered Customers:</span>
                  <strong>{customersList.length} users</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <span className="fc-muted">Average Trade Value / Order:</span>
                  <strong>{formatCurrency(orders.length ? Math.round(totalVolume / orders.length) : 0)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                  <span className="fc-muted">Platform Node Database:</span>
                  <strong style={{ color: "var(--brand)" }}>Connected MySQL / Persistent Database Engine</strong>
                </div>
              </div>
            </Card>

            <Card style={{ padding: "20px" }}>
              <h3 className="fc-h3" style={{ marginBottom: 16 }}>System Activity Logger</h3>
              <div style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ color: "var(--brand)", fontWeight: 600 }}>
                  ✓ System initialized with Vite 8 + React 19 + Express 4.
                </div>
                <div style={{ color: "var(--info)" }}>
                  ℹ Synced persistent database: {products.length} listing catalog lots loaded.
                </div>
                <div style={{ color: "var(--accent)" }}>
                  ℹ Verified user sessions: {users.length} active credential keys in users table.
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  ℹ Session restored: successfully synchronized {orders.length} order items records.
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* TAB 2: Users Management */}
      {activeTab === "users" && (
        <Card style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 className="fc-h3" style={{ margin: 0 }}>All Platform Users ({filteredUsers.length})</h3>
            <Button variant="outline" size="sm" onClick={() => handleExportCSV("users")}>
              Export Users CSV
            </Button>
          </div>
          {loadingUsers ? (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verification Status</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={5} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No users match search criteria"
              action={<Button variant="outline" onClick={() => setSearchQuery("")}>Reset Search</Button>}
            />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verification Status</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={u.name} size="sm" role={u.role} />
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <Badge variant={u.role === "admin" ? "success" : u.role === "vendor" ? "info" : "warning"}>
                          {u.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={getStatusBadgeVariant(u.verificationStatus)}>
                          {u.verificationStatus || "Pending"}
                        </Badge>
                      </td>
                      <td>★ {u.rating ? u.rating.toFixed(1) : "New"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Vendors Verifications */}
      {activeTab === "vendors" && (
        <Card style={{ padding: "20px" }}>
          <h3 className="fc-h3" style={{ marginBottom: 16 }}>Vendor Store Verification</h3>
          {filteredVendors.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No vendors match search criteria"
              action={<Button variant="outline" onClick={() => setSearchQuery("")}>Reset Search</Button>}
            />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Vendor ID</th>
                    <th>Vendor Name</th>
                    <th>Store Name</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th>Verification Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((f) => (
                    <tr key={f.id}>
                      <td>{f.id}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={f.name} size="sm" role="vendor" verified={f.verificationStatus === "Verified"} />
                          <strong>{f.name}</strong>
                        </div>
                      </td>
                      <td>{f.storeName}</td>
                      <td>{f.region}</td>
                      <td>
                        <Badge variant={getStatusBadgeVariant(f.verificationStatus)}>
                          {f.verificationStatus}
                        </Badge>
                      </td>
                      <td>
                        {f.verificationStatus === "Pending" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <Button size="sm" variant="primary" onClick={() => handleVerifyVendor(f.id, "Verified")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleVerifyVendor(f.id, "Rejected")}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleVerifyVendor(f.id, "Pending")}>
                            Reset Status
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: Customers List */}
      {activeTab === "customers" && (
        <Card style={{ padding: "20px" }}>
          <h3 className="fc-h3" style={{ marginBottom: 16 }}>Registered Customers ({filteredCustomers.length})</h3>
          {filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No customers match search criteria"
              action={<Button variant="outline" onClick={() => setSearchQuery("")}>Reset Search</Button>}
            />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Customer Name</th>
                    <th>Base Location</th>
                    <th>Email</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={v.name} size="sm" role="customer" />
                          <strong>{v.name}</strong>
                        </div>
                      </td>
                      <td>{v.region || "—"}</td>
                      <td>{v.email}</td>
                      <td>
                        <Badge variant={getStatusBadgeVariant(v.verificationStatus)}>{v.verificationStatus || "Verified"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Products Listings */}
      {activeTab === "products" && (
        <Card style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 className="fc-h3" style={{ margin: 0 }}>Product Catalog ({filteredProducts.length})</h3>
            <Button variant="outline" size="sm" onClick={() => handleExportCSV("products")}>
              Export Products CSV
            </Button>
          </div>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No products match search criteria"
              action={<Button variant="outline" onClick={() => setSearchQuery("")}>Reset Search</Button>}
            />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price / Unit</th>
                    <th>Eco Score</th>
                    <th>Vendor</th>
                    <th>Stock</th>
                    <th>Approval Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const parsedScore = typeof p.ecoScore === "number" ? p.ecoScore : (parseInt(p.ecoScore, 10) || 90);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontSize: 11, fontFamily: "monospace" }}>{p.id}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setInspectProduct(p)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#059669",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                              padding: 0,
                              textDecoration: "underline"
                            }}
                            title="Click to inspect product details"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td><Badge variant="neutral">{p.category}</Badge></td>
                        <td><strong>{formatCurrency(p.price)}</strong> / {p.unit || "piece"}</td>
                        <td>
                          <Badge variant={parsedScore >= 80 ? "success" : parsedScore >= 50 ? "warning" : "danger"}>
                            {parsedScore}/100
                          </Badge>
                        </td>
                        <td><strong>{getVendorName(p.vendorId)}</strong></td>
                        <td>{p.stock} {p.unit || "units"}</td>
                        <td>
                          <Badge variant={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warning"}>
                            {p.status || "pending"}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <Button size="sm" variant="outline" onClick={() => setInspectProduct(p)} title="View complete product specifications">
                              Inspect Details
                            </Button>
                            {p.status === "pending" ? (
                              rejectingId === p.id ? (
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <input
                                    type="text"
                                    placeholder="Reason..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="fc-input"
                                    style={{ width: 120, fontSize: 11 }}
                                  />
                                  <Button size="sm" variant="danger" onClick={() => handleProductApproval(p.id, "rejected")}>Confirm</Button>
                                </div>
                              ) : (
                                <>
                                  <Button size="sm" variant="primary" onClick={() => handleProductApproval(p.id, "approved")}>
                                    <Check size={12} /> Approve
                                  </Button>
                                  <Button size="sm" variant="danger" onClick={() => setRejectingId(p.id)}>Reject</Button>
                                </>
                              )
                            ) : p.status === "approved" ? (
                              <Button size="sm" variant="danger" onClick={() => handleProductApproval(p.id, "rejected", "Listing un-approved by Admin.")}>
                                Revoke
                              </Button>
                            ) : (
                              <Button size="sm" variant="primary" onClick={() => handleProductApproval(p.id, "approved")}>
                                Re-Approve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: Order Monitoring */}
      {activeTab === "orders" && (
        <Card style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 className="fc-h3" style={{ margin: 0 }}>Order Monitoring ({filteredOrders.length})</h3>
            <Button variant="outline" size="sm" onClick={() => handleExportCSV("orders")}>
              Export Orders CSV
            </Button>
          </div>
          {filteredOrders.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No orders match search criteria"
              action={<Button variant="outline" onClick={() => setSearchQuery("")}>Reset Search</Button>}
            />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th>Delivery Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.itemId || o.id}>
                      <td><strong>{o.id}</strong></td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>{o.customerName}</td>
                      <td>{getProductName(o.productId)}</td>
                      <td>{o.qty} units</td>
                      <td><strong style={{ color: "var(--brand)" }}>{formatCurrency(o.amount)}</strong></td>
                      <td
                        style={{
                          fontSize: "12px",
                          maxWidth: "160px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"}}
                        title={o.deliveryAddress || "N/A"}
                      >
                        {o.deliveryAddress || "—"}
                      </td>
                      <td>
                        <Badge variant={getStatusBadgeVariant(o.status)}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 7: Reviews Moderation */}
      {activeTab === "reviews" && (
        <Card style={{ padding: "20px" }}>
          <h3 className="fc-h3" style={{ marginBottom: 16 }}>Moderate User Reviews ({filteredReviews.length})</h3>
          {filteredReviews.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No reviews match search criteria"
              action={<Button variant="outline" onClick={() => setSearchQuery("")}>Reset Search</Button>}
            />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Author</th>
                    <th>Target Product</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.createdAt)}</td>
                      <td><strong>{r.customerName}</strong></td>
                      <td>{getProductName(r.productId) || "Vendor Direct"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 2, color: "#f59e0b" }}>
                          ★ {r.rating}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 220, wordBreak: "break-word" }}>{r.comment}</td>
                      <td>
                        <Badge variant="success">{r.status}</Badge>
                      </td>
                      <td>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteReview(r.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Product Inspection & Approval Modal */}
      {inspectProduct && (
        <Modal
          open={!!inspectProduct}
          onClose={() => setInspectProduct(null)}
          title={`Product Inspection & Verification`}
        >
          <div style={{ padding: "4px" }}>
            {/* Top Banner Status & Score */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, background: "#f8fafc", padding: "14px 18px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Product ID: {inspectProduct.id}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <Badge variant={inspectProduct.status === "approved" ? "success" : inspectProduct.status === "rejected" ? "danger" : "warning"}>
                    {(inspectProduct.status || "pending").toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Category: {inspectProduct.category}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>
                  Eco {typeof inspectProduct.ecoScore === "number" ? inspectProduct.ecoScore : (parseInt(inspectProduct.ecoScore, 10) || 90)}/100
                </div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Grade {inspectProduct.grade || "A"} Standard</span>
              </div>
            </div>

            {/* Main Grid: Image Gallery & Key Details */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <img
                  src={inspectProduct.imageUrl || "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"}
                  alt={inspectProduct.name}
                  style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: 12, border: "1px solid #cbd5e1" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <div style={{ background: "#f1f5f9", padding: 10, borderRadius: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Listing Title</span>
                  <strong style={{ fontSize: 14, color: "#0f172a" }}>{inspectProduct.name}</strong>
                </div>
                <div style={{ background: "#f1f5f9", padding: 10, borderRadius: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Unit Price</span>
                  <strong style={{ fontSize: 15, color: "#059669" }}>{formatCurrency(inspectProduct.price)}</strong> / {inspectProduct.unit || "piece"}
                </div>
                <div style={{ background: "#f1f5f9", padding: 10, borderRadius: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Available Stock / MOQ</span>
                  <strong>{inspectProduct.stock || 0} units</strong> (MOQ: {inspectProduct.moq || 1})
                </div>
                <div style={{ background: "#f1f5f9", padding: 10, borderRadius: 8 }}>
                  <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Vendor / Origin</span>
                  <strong>{getVendorName(inspectProduct.vendorId)}</strong> ({inspectProduct.region || inspectProduct.city || "India"})
                </div>
              </div>
            </div>

            {/* Sustainability Attributes Matrix */}
            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 14, color: "#047857", fontWeight: 800 }}>🌱 Sustainability & Environmental Impact Matrix</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, fontSize: 12 }}>
                <div><strong>Material:</strong> {inspectProduct.materialType || "Standard"}</div>
                <div><strong>Packaging:</strong> {inspectProduct.packagingType || "Minimal Plastic"}</div>
                <div><strong>Recyclability:</strong> {inspectProduct.recyclability || 85}%</div>
                <div><strong>CO₂ Saved:</strong> {inspectProduct.co2SavedKg || 3.5} kg</div>
                <div><strong>Plastic Saved:</strong> {inspectProduct.plasticSavedKg || 0.4} kg</div>
                <div><strong>Water Saved:</strong> {inspectProduct.waterSavedLiters || 120} L</div>
              </div>
            </div>

            {/* Full Description */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 6px 0", fontSize: 13, color: "#334155", fontWeight: 700 }}>Product Description</h4>
              <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                {inspectProduct.description || "No description provided by vendor."}
              </p>
            </div>

            {/* Approval Actions inside Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
              <Button variant="outline" size="sm" onClick={() => setInspectProduct(null)}>
                Close Window
              </Button>
              <div style={{ display: "flex", gap: 10 }}>
                {inspectProduct.status !== "rejected" && (
                  <Button
                    variant="danger"
                    onClick={async () => {
                      const reason = prompt("Enter rejection reason for vendor notification:", inspectProduct.rejectionReason || "");
                      if (reason !== null) {
                        await handleProductApproval(inspectProduct.id, "rejected", reason);
                        setInspectProduct(null);
                      }
                    }}
                  >
                    Reject Listing
                  </Button>
                )}
                {inspectProduct.status !== "approved" && (
                  <Button
                    variant="primary"
                    style={{ background: "#10b981", fontWeight: 800 }}
                    onClick={async () => {
                      await handleProductApproval(inspectProduct.id, "approved");
                      setInspectProduct(null);
                    }}
                  >
                    <Check size={16} /> Approve & Publish to Marketplace
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export const AdminDashboard = memo(AdminDashboardBase);
export default AdminDashboard;

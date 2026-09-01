import { useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  StatCard,
  Avatar,
  EmptyState,
} from "../../components/common/index.js";
import {
  Check,
  Plus,
  Package,
  TrendingUp,
  ClipboardList,
  MapPin,
} from "../../components/icons/Icons.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useData } from "../../hooks/useData.js";
import { formatDate } from "../../utils/formatters.js";
import { MapBoxView } from "../../components/common/MapBoxView.jsx";

function MyStoreBase() {
  const { vendorProfile, user } = useAuth();
  const { products } = useData();
  const navigate = useNavigate();

  const currentVendorId = vendorProfile?.id || user?.id;

  const myProducts = useMemo(
    () => products.filter((p) => p.vendorId && currentVendorId && String(p.vendorId) === String(currentVendorId)),
    [products, currentVendorId]
  );

  const approvedCount = myProducts.filter((p) => p.status === "approved").length;
  const pendingCount = myProducts.filter((p) => p.status === "pending").length;
  const avgEcoScore = myProducts.length
    ? Math.round(myProducts.reduce((sum, p) => sum + (p.ecoScore || 0), 0) / myProducts.length)
    : 0;

  const recentProducts = useMemo(
    () => [...myProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [myProducts]
  );

  return (
    <div className="fc-page-transition">
      {/* Store Identity Hero Header */}
      <div
        className="fc-hero"
        style={{
          background: "linear-gradient(rgba(10, 32, 18, 0.78), rgba(5, 19, 11, 0.88)), url('/images/ecomart-farm.jpg') center/cover no-repeat",
          padding: "36px 32px",
          borderRadius: "var(--radius-lg)",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Avatar name={vendorProfile?.name} size="lg" role="vendor" verified={user?.verificationStatus === "Verified"} />
              <div>
                <span style={{ fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.9 }}>
                  MY STORE
                </span>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                  {vendorProfile?.storeName || "My EcoMart Store"}
                </h1>
              </div>
            </div>
            <p style={{ margin: "6px 0 0 0", opacity: 0.9, fontSize: "14px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span>📍 {[vendorProfile?.city, vendorProfile?.district, vendorProfile?.region].filter(Boolean).join(", ") || "Location not set"}</span>
              <span>•</span>
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 10px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700 }}>
                <Check size={12} style={{ display: "inline", marginRight: 3 }} />
                {user?.verificationStatus === "Verified" ? "Verified Vendor" : "Verification Pending"}
              </span>
            </p>
          </div>

          <Button
            variant="accent"
            size="md"
            onClick={() => navigate("/vendor/products")}
            style={{ fontWeight: 700, boxShadow: "var(--shadow-sm)" }}
          >
            <Plus size={15} /> Add Product Listing
          </Button>
        </div>
      </div>

      {/* Store Overview Stat Cards (real data only) */}
      <div className="fc-stat-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          label="Total Products"
          value={myProducts.length}
          icon={<Package size={20} />}
          color="var(--brand)"
          bg="var(--brand-light)"
        />
        <StatCard
          label="Live & Approved"
          value={approvedCount}
          icon={<Check size={20} />}
          color="var(--success)"
          bg="var(--success-light)"
        />
        <StatCard
          label="Pending Approval"
          value={pendingCount}
          icon={<ClipboardList size={20} />}
          color="var(--warning)"
          bg="var(--info-light)"
        />
        <StatCard
          label="Average Eco Score"
          value={`${avgEcoScore}/100`}
          icon={<TrendingUp size={20} />}
          color="var(--info)"
          bg="var(--info-light)"
        />
      </div>

      {/* Store Location Map (real vendor location) */}
      <Card style={{ padding: "22px", marginBottom: "24px" }}>
        <CardHeader style={{ marginBottom: "16px", padding: 0 }}>
          <div>
            <h2 className="fc-h2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={20} style={{ color: "var(--brand)" }} /> Store Location
            </h2>
            <p className="fc-muted" style={{ marginTop: "2px", fontSize: "13px" }}>
              {[vendorProfile?.city, vendorProfile?.district, vendorProfile?.region, vendorProfile?.countryName || "India"].filter(Boolean).join(", ") || "Set your location in Profile settings"}
            </p>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <MapBoxView
            markers={[
              {
                id: "store-1",
                title: vendorProfile?.storeName || "My Store",
                vendorName: vendorProfile?.name,
                city: vendorProfile?.city || "",
                district: vendorProfile?.district || "",
                region: vendorProfile?.region || "",
                countryCode: vendorProfile?.countryCode || "IN",
                lat: vendorProfile?.lat || 9.1724,
                lng: vendorProfile?.lng || 77.8687
              }
            ]}
            center={{ lat: vendorProfile?.lat || 9.1724, lng: vendorProfile?.lng || 77.8687 }}
            height="320px"
          />
        </CardBody>
      </Card>

      {/* Recent Product Listings (real data) */}
      <Card style={{ padding: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 className="fc-h3" style={{ margin: 0 }}>Recent Product Listings</h3>
          <Button variant="outline" size="sm" onClick={() => navigate("/vendor/products")}>
            View All Products
          </Button>
        </div>

        {recentProducts.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title="No products listed yet"
            description="Add your first sustainable product to get started."
            action={<Button variant="primary" onClick={() => navigate("/vendor/products")}>Add Product</Button>}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  background: "var(--bg-soft)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{p.name}</strong>
                  <div className="fc-soft" style={{ fontSize: 11, marginTop: 2 }}>
                    {p.category} • Eco Score {p.ecoScore ?? 0}/100 • Listed {p.createdAt ? formatDate(p.createdAt) : "—"}
                  </div>
                </div>
                <Badge variant={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warning"}>
                  {p.status || "pending"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export const MyStore = memo(MyStoreBase);
export default MyStore;

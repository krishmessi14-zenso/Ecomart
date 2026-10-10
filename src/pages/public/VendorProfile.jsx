import { useState, useEffect, useMemo, memo } from "react";
import { useParams, useNavigate} from "react-router-dom";
import { Avatar } from "../../components/common/Avatar.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { Button } from "../../components/common/Button.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ProductCard } from "../../components/product/ProductCard.jsx";
import { ContactVendorModal } from "../../components/common/ContactVendorModal.jsx";
import { MapPin, Package, ShoppingBag, ArrowLeft, MessageSquare } from "../../components/icons/Icons.jsx";
import { useData } from "../../hooks/useData.js";
import { useCart } from "../../hooks/useCart.js";
import { useAuth } from "../../hooks/useAuth.js";

function VendorProfileBase() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { products } = useData();
  const { wishlist, addToCart, toggleWishlist } = useCart();
  const { user: currentUser } = useAuth();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMode, setContactMode] = useState("message");

  // Fetch vendor user details
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((users) => {
        const found = users.find((u) => u.id === vendorId && u.role === "vendor");
        if (found) {
          setVendor(found);
        } else {
          setVendor(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load vendor profile:", err);
        setLoading(false);
      });
  }, [vendorId]);

  // Vendor's listed products
  const vendorProducts = useMemo(() => {
    if (!products || !vendorId) return [];
    return products.filter((p) => p.vendorId === vendorId);
  }, [products, vendorId]);

  const handleOpenContact = (mode = "message") => {
    setContactMode(mode);
    setContactOpen(true);
  };

  if (loading) {
    return (
      <div className="fc-container fc-page-transition" style={{ padding: "40px 24px" }}>
        <div className="fc-panel" style={{ height: 260, animation: "pulse 1.5s infinite" }} />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="fc-container fc-page-transition" style={{ padding: "60px 24px" }}>
        <EmptyState
          icon={<ShoppingBag size={32} />}
          title="Vendor Profile Not Found"
          description="The requested vendor profile does not exist or has been deactivated."
          action={
            <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
              ← Back to Marketplace
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="fc-container fc-page-transition" style={{ padding: "24px 24px 60px 24px" }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-soft)",
            fontSize: 13,
            fontWeight: 600}}
        >
          <ArrowLeft size={15} /> Back
        </button>
      </div>

      {/* Hero Header Card */}
      <div
        className="fc-panel"
        style={{
          padding: "32px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          marginBottom: "32px",
          position: "relative",
          overflow: "hidden"}}
      >
        {/* Top Accent Strip */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "var(--brand)" }} />

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Avatar name={vendor.name} size="xl" role="vendor" verified={vendor.verificationStatus === "Verified"} />

          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: 0, color: "var(--text)" }}>
                {vendor.name}
              </h1>
              {vendor.verificationStatus === "Verified" && (
                <Badge variant="success" style={{ fontSize: 11, fontWeight: 800 }}>
                  ✓ VERIFIED GROWER
                </Badge>
              )}
            </div>

            <p className="fc-muted" style={{ fontSize: 14, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} style={{ color: "var(--brand)" }} />
              <strong>{vendor.storeName || "Nashik sustainable Estates"}</strong> • {vendor.region || "Maharashtra"}
            </p>

            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-muted)", maxWidth: 700, margin: "0 0 20px 0" }}>
              {vendor.about || "Dedicated to sourcing high-grade sustainable products directly for eco-conscious customers. Every product undergoes quality grading and sustainability verification."}
            </p>

            {/* Quick Action CTAs */}
            <div className="fc-flex-gap-12" style={{ flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => handleOpenContact("message")} style={{ fontWeight: 700 }}>
                <MessageSquare size={16} /> Contact Vendor
              </Button>
              <Button variant="accent" onClick={() => handleOpenContact("bulk")} style={{ fontWeight: 700 }}>
                Request Bulk Quote
              </Button>
            </div>
          </div>

          {/* Stats Box */}
          <div
            style={{
              background: "var(--bg-soft)",
              padding: "20px 24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 200}}
          >
            <div>
              <span className="fc-soft" style={{ fontSize: 11, display: "block" }}>GROWER RATING</span>
              <strong style={{ fontSize: 18, color: "var(--brand)" }}>★ {vendor.rating?.toFixed(1) || "4.8"} / 5.0</strong>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <span className="fc-soft" style={{ fontSize: 11, display: "block" }}>ACTIVE products LISTED</span>
              <strong style={{ fontSize: 16 }}>{vendorProducts.length} products lots</strong>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <span className="fc-soft" style={{ fontSize: 11, display: "block" }}>FULFILLED marketplace ORDERS</span>
              <strong style={{ fontSize: 16 }}>{vendor.completedOrders || 120}+ orders</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor's products Listings Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 800, margin: 0 }}>
              products Listings by {vendor.name}
            </h2>
            <p className="fc-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Direct wholesale products lots ready for immediate procurement.
            </p>
          </div>
          <span className="fc-soft" style={{ fontSize: 13, fontWeight: 600 }}>
            {vendorProducts.length} lots available
          </span>
        </div>

        {vendorProducts.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title="No Active products Lots Listed Currently"
            description="This vendor has no active products lots available for sale right now."
          />
        ) : (
          <div className="fc-product-grid">
            {vendorProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                vendorName={vendor.name}
                region={vendor.region}
                mode="customer"
                inWishlist={wishlist.includes(p.id)}
                onAdd={(id) => addToCart(id, p.moq || 10)}
                onToggleWishlist={toggleWishlist}
                onView={(prod) => navigate(`/customer/products/${prod.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contact Vendor Modal */}
      <ContactVendorModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        vendor={vendor}
        mode={contactMode}
      />
    </div>
  );
}

export const VendorProfile = memo(VendorProfileBase);
export default VendorProfile;

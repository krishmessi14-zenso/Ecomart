import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Button,
  Card,
  Badge,
  Avatar,
  Tabs,
  Skeleton,
  EmptyState,
} from "../../components/common/index.js";
import { ProductCard } from "../../components/product/ProductCard.jsx";
import {
  Cart as CartIcon,
  Heart,
  Star,
  Check,
  ArrowLeft,
  ShoppingBag,
} from "../../components/icons/Icons.jsx";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { useData } from "../../hooks/useData.js";
import { useCart } from "../../hooks/useCart.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { useAuth } from "../../hooks/useAuth.js";
import { getProductImage } from "../../utils/constants.js";

function ProductDetailsBase() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const { products } = useData();
  const { wishlist, addToCart, toggleWishlist } = useCart();
  const { notifySuccess } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(10);
  const [activeTab, setActiveTab] = useState("specs");

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  // Fetch vendors list
  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        setVendors(users.filter((u) => u.role === "vendor"));
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  // Find product by ID
  const product = useMemo(() => {
    if (!products || !productId) return null;
    return products.find((p) => String(p.id) === String(productId));
  }, [products, productId]);

  // Set initial quantity to product MOQ
  useEffect(() => {
    if (product) {
      setQuantity(product.moq || 10);
    }
  }, [product]);

  // Fetch reviews for current product
  const fetchReviews = useCallback(async (prodId) => {
    try {
      const res = await fetch(`/api/reviews?productId=${prodId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  }, []);

  useEffect(() => {
    if (product) {
      fetchReviews(product.id);
    }
  }, [product, fetchReviews]);

  // Vendor lookup
  const vendor = useMemo(() => {
    if (!product) return null;
    return (
      vendors.find((f) => f.id === product.vendorId) || {
        name: "EcoMart Vendor",
        storeName: "Unavailable Store",
        region: product.region || "",
        verificationStatus: "Pending",
        rating: 0,
      }
    );
  }, [vendors, product]);

  // Gallery images array
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const fallback = getProductImage(product);
    if (product.imageUrl) {
      return [product.imageUrl, fallback];
    }
    return [fallback];
  }, [product]);

  // Freshness calculation
  const isFresh = useMemo(() => {
    if (!product?.harvestDate) return false;
    const diffTime = Math.abs(new Date() - new Date(product.harvestDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }, [product?.harvestDate]);

  // Related products (same category)
  const relatedProducts = useMemo(() => {
    if (!product || !products) return [];
    return products
      .filter((p) => p.category === product.category && String(p.id) !== String(product.id))
      .slice(0, 4);
  }, [product, products]);

  // Wholesale Tiers
  const tierEntries = useMemo(() => {
    if (!product?.tierPrices) return [];
    try {
      const parsed = JSON.parse(product.tierPrices);
      return Object.entries(parsed);
    } catch {
      return [];
    }
  }, [product?.tierPrices]);

  // Handlers
  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product.id, quantity);
    setAddedFlash(true);
    notifySuccess(`Added ${quantity} ${product.unit} to cart!`);
    setTimeout(() => setAddedFlash(false), 1000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product.id, quantity);
    notifySuccess(`Proceeding to checkout with ${quantity} ${product.unit}...`);
    navigate("/customer/checkout");
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    const wasIn = wishlist.includes(product.id);
    toggleWishlist(product.id);
    notifySuccess(wasIn ? t("removedFromWishlist") : t("addedToWishlist"));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !product || !currentUser) return;

    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          vendorId: product.vendorId,
          customerId: currentUser.id,
          customerName: currentUser.name,
          rating: newRating,
          comment: newComment,
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setReviews((prev) => [added, ...prev]);
        setNewComment("");
        setNewRating(5);
        notifySuccess("Review submitted successfully!");
        fetchVendors();
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="fc-page-transition" style={{ padding: "20px 0" }}>
        <Skeleton height={24} width={200} style={{ marginBottom: 20 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Skeleton height={380} radius={12} />
          <div>
            <Skeleton height={32} width="80%" style={{ marginBottom: 12 }} />
            <Skeleton height={20} width="50%" style={{ marginBottom: 20 }} />
            <Skeleton height={48} width="40%" style={{ marginBottom: 24 }} />
            <Skeleton height={120} width="100%" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fc-page-transition" style={{ padding: "40px 0" }}>
        <EmptyState
          icon={<ShoppingBag size={32} />}
          title="Product Listing Unavailable"
          description="The requested produce listing may have been sold out or removed by the grower."
          action={
            <Button variant="primary" onClick={() => navigate("/customer/marketplace")}>
              ← Back to Marketplace
            </Button>
          }
        />
      </div>
    );
  }

  const mainImg = galleryImages[selectedImage] || galleryImages[0];
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="fc-page-transition">
      {/* Breadcrumb Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
          <Link to="/customer/marketplace" style={{ color: "var(--brand)", fontWeight: 600 }}>
            Marketplace
          </Link>
          <span>/</span>
          <span>{product.category}</span>
          <span>/</span>
          <strong style={{ color: "var(--text)" }}>{product.name}</strong>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/customer/marketplace")}>
          <ArrowLeft size={14} /> Back to Marketplace
        </Button>
      </div>

      {/* Main Grid: Left Gallery + Right Purchase Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28, alignItems: "start", marginBottom: 36 }}>
        {/* LEFT: Large Product Image Gallery */}
        <div>
          <div
            style={{
              position: "relative",
              height: 380,
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--bg-soft)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
              marginBottom: 14,
            }}
          >
            <img
              src={mainImg}
              alt={product.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              className="fc-product-thumb-img"
            />

            {/* Gradient Overlay for Badges */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Overlay Badges */}
            <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 2 }}>
              {product.organic === 1 && <Badge variant="organic" />}
              {isFresh && (
                <span className="fc-status-badge" style={{ background: "var(--info)", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                  🌍 ECO SCORE {product.ecoScore ?? 0}
                </span>
              )}
              <span className="fc-status-badge" style={{ background: "var(--surface)", color: "var(--text)", fontSize: 10, fontWeight: 700 }}>
                Grade {product.grade}
              </span>
            </div>
          </div>

          {/* Thumbnail Navigation Strip */}
          {galleryImages.length > 1 && (
            <div style={{ display: "flex", gap: 10 }}>
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: selectedImage === idx ? "2px solid var(--brand)" : "1px solid var(--border)",
                    cursor: "pointer",
                    padding: 0,
                    background: "none",
                    opacity: selectedImage === idx ? 1 : 0.7,
                    transition: "all 0.15s ease",
                  }}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Product Information & Purchase Controls (Sticky Desktop Panel) */}
        <Card className="fc-panel" style={{ padding: "26px", position: "sticky", top: "82px" }}>
          {/* Header & Category */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>
              {product.category}
            </span>
            <Badge variant="success">Grade {product.grade}</Badge>
          </div>

          {/* Product Title */}
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "26px", fontWeight: 800, margin: "0 0 10px 0", color: "var(--text)", lineHeight: 1.25 }}>
            {product.name}
          </h1>

          {/* Grower Information Line */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <Avatar name={vendor.name} size="md" role="vendor" verified />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{vendor.name}</span>
                <span style={{ color: "var(--brand)", fontSize: "11px" }} title="Verified Grower">
                  ✓ Verified
                </span>
              </div>
              <div className="fc-soft" style={{ fontSize: "11.5px" }}>
                {vendor.storeName || "Nashik Agrarian Estates"} • {vendor.region || product.region || "Maharashtra"}
              </div>
            </div>
          </div>

          {/* Price Header */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-soft)" }}>
              WHOLESALE B2B PRICE
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <strong style={{ fontFamily: "var(--font-heading)", fontSize: "28px", color: "var(--text)" }}>
                {formatCurrency(product.price)}
              </strong>
              <span className="fc-soft" style={{ fontSize: "14px" }}>
                /{product.unit}
              </span>
            </div>
          </div>

          {/* Stock & MOQ Info Badges */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20, background: "var(--bg-soft)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <div>
              <span className="fc-soft" style={{ fontSize: 11, display: "block" }}>AVAILABLE STOCK</span>
              <strong style={{ fontSize: 13.5 }}>{product.stock} {product.unit}</strong>
            </div>
            <div>
              <span className="fc-soft" style={{ fontSize: 11, display: "block" }}>MINIMUM ORDER (MOQ)</span>
              <strong style={{ fontSize: 13.5 }}>{product.moq || 10} {product.unit}</strong>
            </div>
          </div>

          {/* Quantity Selector */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: 8, color: "var(--text)" }}>
              Order Quantity ({product.unit}):
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="fc-btn fc-btn-outline fc-btn-sm"
                onClick={() => setQuantity((q) => Math.max(product.moq || 10, q - (product.moq || 5)))}
                disabled={quantity <= (product.moq || 10)}
                style={{ width: 36, height: 36, padding: 0, fontWeight: 800 }}
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(product.moq || 10, Number(e.target.value)))}
                min={product.moq || 10}
                style={{
                  width: 90,
                  height: 36,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              />
              <button
                className="fc-btn fc-btn-outline fc-btn-sm"
                onClick={() => setQuantity((q) => q + (product.moq || 5))}
                style={{ width: 36, height: 36, padding: 0, fontWeight: 800 }}
              >
                +
              </button>
              <span className="fc-soft" style={{ fontSize: 12, marginLeft: 4 }}>
                Subtotal: <strong>{formatCurrency(product.price * quantity)}</strong>
              </span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="primary" full onClick={handleAddToCart} style={{ padding: "12px", fontWeight: 700 }}>
                {addedFlash ? <Check size={16} /> : <CartIcon size={16} />} {addedFlash ? "Added!" : "Add to Cart"}
              </Button>
              <Button variant="outline" onClick={handleToggleWishlist} aria-label="Toggle Wishlist" style={{ padding: "12px" }}>
                <Heart size={16} filled={isWishlisted} />
              </Button>
            </div>
            <Button variant="accent" full onClick={handleBuyNow} style={{ padding: "12px", fontWeight: 700 }}>
              Buy Now (Proceed to Checkout) →
            </Button>
          </div>
        </Card>
      </div>

      {/* BELOW SECTIONS: Tabs for Specs, Bulk Tiers, Grower Info, Reviews */}
      <Card style={{ padding: "26px", marginBottom: "36px" }}>
        <Tabs
          tabs={[
            { id: "specs", label: "Overview & Specifications" },
            { id: "tiers", label: "Bulk Wholesale Tiers", badge: tierEntries.length },
            { id: "grower", label: "Vendor & Store Details" },
            { id: "reviews", label: `Purchaser Reviews (${reviews.length})` },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId)}
          variant="underline"
          style={{ marginBottom: 20 }}
        />

        {/* Tab 1: Overview & Specs */}
        {activeTab === "specs" && (
          <div className="fc-fade-in">
            <p className="fc-muted" style={{ fontSize: "14px", lineHeight: 1.6, marginBottom: 20 }}>
              {product.description || "A verified sustainable product, screened for material quality, packaging, and environmental impact before approval."}
            </p>

            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: 12 }}>Product Specifications</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
              <div style={{ background: "var(--bg-soft)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}>
                <span className="fc-soft" style={{ display: "block", fontSize: 11 }}>CATEGORY</span>
                <strong>{product.category}</strong>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}>
                <span className="fc-soft" style={{ display: "block", fontSize: 11 }}>QUALITY GRADE</span>
                <strong>Grade {product.grade}</strong>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}>
                <span className="fc-soft" style={{ display: "block", fontSize: 11 }}>LISTED DATE</span>
                <strong>{product.harvestDate ? formatDate(product.harvestDate) : "—"}</strong>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}>
                <span className="fc-soft" style={{ display: "block", fontSize: 11 }}>SUSTAINABILITY CERTIFICATION</span>
                <strong>{product.organic === 1 ? "🌿 Certified Sustainable" : "Standard Listing"}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bulk Wholesale Pricing Tiers */}
        {activeTab === "tiers" && (
          <div className="fc-fade-in">
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>
              📈 Bulk Volume B2B Pricing Tiers
            </h4>
            {tierEntries.length > 0 ? (
              <div className="fc-table-wrap">
                <table className="fc-table">
                  <thead>
                    <tr>
                      <th>Order Quantity Range</th>
                      <th>Unit B2B Price</th>
                      <th>Savings Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{product.moq} - {tierEntries[0][0]} {product.unit}</td>
                      <td><strong>{formatCurrency(product.price)}</strong> / {product.unit}</td>
                      <td><Badge variant="neutral">Base Price</Badge></td>
                    </tr>
                    {tierEntries.map(([qty, pr], idx) => {
                      const nextQty = tierEntries[idx + 1] ? `${tierEntries[idx + 1][0]} ${product.unit}` : "+";
                      const savings = Math.round(((product.price - Number(pr)) / product.price) * 100);
                      return (
                        <tr key={qty}>
                          <td>{qty} {nextQty === "+" ? `${qty}+` : `${qty} - ${nextQty}`} {product.unit}</td>
                          <td><strong style={{ color: "var(--brand)" }}>{formatCurrency(Number(pr))}</strong> / {product.unit}</td>
                          <td><Badge variant="success">Save {savings}%</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="fc-muted" style={{ fontStyle: "italic", fontSize: 13 }}>
                Standard volume pricing applies. No tiered discounts currently configured for this lot.
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Grower Information */}
        {activeTab === "grower" && (
          <div className="fc-fade-in" style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <Avatar name={vendor.name} size="xl" role="vendor" verified />
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text)" }}>
                {vendor.name}
              </h3>
              <p className="fc-muted" style={{ fontSize: "13px", margin: "0 0 12px 0" }}>
                {vendor.storeName || "Nashik Agrarian Estates"} • {vendor.region || product.region || "Maharashtra"}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                <span style={{ background: "var(--brand-light)", color: "var(--brand)", padding: "4px 10px", borderRadius: "999px", fontWeight: 700 }}>
                  ★ {vendor.rating?.toFixed(1) || "4.8"} Grower Rating
                </span>
                <span style={{ background: "var(--accent-light)", color: "var(--accent)", padding: "4px 10px", borderRadius: "999px", fontWeight: 700 }}>
                  ✓ 100% Direct B2B Verified
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Purchaser Reviews */}
        {activeTab === "reviews" && (
          <div className="fc-fade-in">
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: 12 }}>
              Verified Purchaser Reviews ({reviews.length})
            </h4>

            {/* Write Review Form */}
            <form onSubmit={handleSubmitReview} style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Write a Purchaser Review</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewRating(i + 1)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <Star size={16} color={i < newRating ? "#f59e0b" : "var(--border-strong)"} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="fc-textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share details of produce uniformity, shelf-life, and delivery..."
                style={{ fontSize: "13px", padding: "10px", minHeight: 75 }}
                required
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Button type="submit" variant="accent" size="sm" disabled={submittingReview}>
                  Submit Review
                </Button>
              </div>
            </form>

            {/* Reviews List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reviews.length === 0 ? (
                <p className="fc-soft" style={{ fontStyle: "italic", fontSize: 13 }}>
                  No purchaser reviews posted for this lot yet.
                </p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <strong style={{ fontSize: 13 }}>{r.customerName}</strong>
                      <div style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} color={i < r.rating ? "#f59e0b" : "var(--border-strong)"} />
                        ))}
                      </div>
                    </div>
                    <div className="fc-soft" style={{ fontSize: 11, display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span>{formatDate(r.createdAt)}</span>
                      {r.verifiedPurchase === 1 && (
                        <span style={{ color: "var(--brand)", fontWeight: 700 }}>✓ Verified Purchaser</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--text)" }}>{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Related Produce Recommendations Grid */}
      {relatedProducts.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 800, marginBottom: 16 }}>
            Related {product.category} Produce
          </h2>
          <div className="fc-product-grid">
            {relatedProducts.map((rel) => {
              const relVendor = vendors.find((f) => f.id === rel.vendorId) || { name: "Verified Grower", region: rel.region };
              return (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  vendorName={relVendor.name}
                  region={relVendor.region}
                  mode="customer"
                  inWishlist={wishlist.includes(rel.id)}
                  onAdd={(id) => addToCart(id, rel.moq || 10)}
                  onToggleWishlist={toggleWishlist}
                  onView={(p) => navigate(`/customer/products/${p.id}`)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--surface)",
          borderTop: "1.5px solid var(--border)",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 100,
        }}
        className="fc-mobile-bottom-bar"
      >
        <div>
          <span className="fc-soft" style={{ fontSize: 11, display: "block" }}>TOTAL ({quantity} {product.unit})</span>
          <strong style={{ fontSize: 16, color: "var(--brand)" }}>{formatCurrency(product.price * quantity)}</strong>
        </div>
        <div className="fc-flex-gap-8">
          <Button variant="primary" size="sm" onClick={handleAddToCart}>
            Add to Cart
          </Button>
          <Button variant="accent" size="sm" onClick={handleBuyNow}>
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ProductDetails = memo(ProductDetailsBase);
export default ProductDetails;

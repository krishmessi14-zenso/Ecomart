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
  EcoScoreGauge,
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [quantity, setQuantity] = useState(10);
  const [activeTab, setActiveTab] = useState("specs");

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  // AI Product Voice Explanation State
  const [explainingAi, setExplainingAi] = useState(false);
  const [aiExplanationText, setAiExplanationText] = useState("");

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

  // Set initial quantity to product MOQ (defaulting to 1)
  useEffect(() => {
    if (product) {
      setQuantity(product.moq || 1);
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

  // Gallery items array with color and multi-image support
  const galleryItems = useMemo(() => {
    if (!product) return [];
    const fallback = getProductImage(product);
    let list = [];
    if (product.images) {
      try {
        const parsed = typeof product.images === "string" ? JSON.parse(product.images) : product.images;
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed
            .map((item) =>
              typeof item === "object" && item !== null && item.imageUrl
                ? { color: item.color || null, colorHex: item.colorHex || null, imageUrl: item.imageUrl }
                : { color: null, colorHex: null, imageUrl: typeof item === "string" ? item : "" }
            )
            .filter((item) => item.imageUrl && item.imageUrl.trim() !== "");
        }
      } catch {
        if (typeof product.images === "string") {
          list = product.images
            .split(",")
            .map((url) => url.trim())
            .filter(Boolean)
            .map((url) => ({ color: null, colorHex: null, imageUrl: url }));
        }
      }
    }
    if (list.length === 0 && product.imageUrl && product.imageUrl.trim() !== "") {
      list = [{ color: null, colorHex: null, imageUrl: product.imageUrl }];
    }

    // Default multi-image fallbacks for Bamboo Water Bottle if only 1 image provided
    if ((String(product.id) === "p_sample_bamboo_bottle" || product.name?.toLowerCase().includes("bamboo water bottle")) && list.length <= 1) {
      list = [
        { color: "Natural Bamboo", colorHex: "#d4a373", imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1000" },
        { color: "Stainless Steel Interior", colorHex: "#94a3b8", imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=1000" },
        { color: "Eco Matte Finish", colorHex: "#334155", imageUrl: "https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=1000" }
      ];
    }

    if (list.length === 0) {
      list = [{ color: null, colorHex: null, imageUrl: fallback }];
    }
    return list;
  }, [product]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, galleryItems]);

  // Dynamic Product Key Features calculation
  const productFeatures = useMemo(() => {
    if (!product) return [];

    if (product.features) {
      try {
        const parsed = typeof product.features === "string" ? JSON.parse(product.features) : product.features;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((f) => (typeof f === "string" ? { icon: "🌱", title: f, description: "" } : f));
        }
      } catch (e) {
        console.error("Failed to parse product.features", e);
      }
    }

    // Custom features for Water Bottle
    if (
      String(product.id) === "p_sample_bamboo_bottle" ||
      product.name?.toLowerCase().includes("water bottle") ||
      product.name?.toLowerCase().includes("bamboo bottle")
    ) {
      return [
        {
          icon: "🌡️",
          title: "12-Hour Thermal Insulation",
          description: "Double-walled vacuum interior keeps beverages ice-cold up to 24h or hot up to 12h.",
        },
        {
          icon: "🌿",
          title: "100% Organic Bamboo Casing",
          description: "Handcrafted natural bamboo outer layer with smooth protective eco seal.",
        },
        {
          icon: "🛡️",
          title: "Food-Grade 304 Stainless Steel",
          description: "100% BPA-free, toxin-free interior that leaves zero metallic aftertaste.",
        },
        {
          icon: "💧",
          title: "Leak-Proof Precision Lid",
          description: "Ergonomic cap with silicone sealing ring ensures 100% spill-proof travel.",
        },
        {
          icon: "📦",
          title: "Zero-Plastic Packaging",
          description: "Shipped in 100% recyclable, plastic-free biodegradable corrugated packaging.",
        },
      ];
    }

    // Fallback features derived from product properties
    const list = [];
    if (product.organic === 1) {
      list.push({
        icon: "🌿",
        title: "Certified Sustainable",
        description: "Screened and certified for eco-friendly material origin and low carbon footprint.",
      });
    }
    if (product.grade) {
      list.push({
        icon: "⭐",
        title: `Grade ${product.grade} Quality Standard`,
        description: "Screened for high structural integrity, uniform finish, and long lifecycle.",
      });
    }
    if (product.materialType) {
      list.push({
        icon: "🔬",
        title: `${product.materialType.replace("_", " ").toUpperCase()} Composition`,
        description: `Manufactured using eco-friendly ${product.materialType} material.`,
      });
    }
    if (product.recyclability) {
      list.push({
        icon: "♻️",
        title: `${product.recyclability}% Recyclable`,
        description: "Designed for circular usage lifecycle and hassle-free material recycling.",
      });
    }
    return list;
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

  // Calculate active tier price based on selected quantity
  const activeTierPrice = useMemo(() => {
    if (!product) return 0;
    if (!tierEntries.length) return product.price || 0;
    let applicable = product.price;
    for (const [qtyStr, priceVal] of tierEntries) {
      if (quantity >= Number(qtyStr)) {
        applicable = Number(priceVal);
      }
    }
    return applicable;
  }, [product, tierEntries, quantity]);

  const activeTierSavings = useMemo(() => {
    if (!product || !product.price || activeTierPrice >= product.price) return 0;
    return Math.round(((product.price - activeTierPrice) / product.price) * 100);
  }, [product, activeTierPrice]);

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

  const handleExplainProduct = async () => {
    if (!product) return;
    setExplainingAi(true);
    try {
      const res = await fetch("/api/ai/product-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, language: "en-IN" })
      });
      if (res.ok) {
        const data = await res.json();
        setAiExplanationText(data.explanation);
        if (window.speechSynthesis && data.explanation) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.explanation.replace(/[*#_`]/g, ""));
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      console.error("Error fetching product explanation:", err);
    } finally {
      setExplainingAi(false);
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

  const mainImg = galleryItems[selectedImage]?.imageUrl || galleryItems[0]?.imageUrl || getProductImage(product);
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
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              setLightboxIndex(selectedImage);
              setIsLightboxOpen(true);
            }}
            title="Click to view full screen uncropped image"
          >
            <img
              src={mainImg}
              alt={product.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                padding: "16px",
                transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              className="fc-product-thumb-img"
            />

            {/* Gradient Overlay for Badges */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.25) 100%)",
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

            {/* Image Count Badge */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                backdropFilter: "blur(4px)",
                zIndex: 2,
              }}
            >
              🔍 {selectedImage + 1}/{galleryItems.length}
            </div>
          </div>

          {/* Color Options Swatches */}
          {galleryItems.some((item) => item.color) && (
            <div style={{ marginBottom: 16, background: "var(--bg-soft)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
                🎨 Option / Variant: <strong style={{ color: "var(--brand)" }}>{galleryItems[selectedImage]?.color || "Default"}</strong>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {galleryItems.map((item, idx) => (
                  item.color ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedImage(idx);
                        setLightboxIndex(idx);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: "20px",
                        border: selectedImage === idx ? "2px solid var(--brand)" : "1px solid var(--border)",
                        background: selectedImage === idx ? "var(--brand-light)" : "var(--surface)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: selectedImage === idx ? 700 : 500,
                        color: "var(--text)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {item.colorHex && (
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            backgroundColor: item.colorHex,
                            border: "1px solid rgba(0,0,0,0.15)",
                            display: "inline-block",
                          }}
                        />
                      )}
                      <span>{item.color}</span>
                    </button>
                  ) : null
                ))}
              </div>
            </div>
          )}

          {/* Thumbnail Navigation Strip */}
          {galleryItems.length > 1 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {galleryItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedImage(idx);
                    setLightboxIndex(idx);
                  }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: selectedImage === idx ? "2px solid var(--brand)" : "1px solid var(--border)",
                    cursor: "pointer",
                    padding: "4px",
                    background: "var(--bg-soft)",
                    opacity: selectedImage === idx ? 1 : 0.7,
                    transition: "all 0.15s ease",
                  }}
                >
                  <img src={item.imageUrl} alt={item.color || `Thumbnail ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </button>
              ))}
            </div>
          )}

          {/* 🌱 Sustainability & Impact Metrics Gauge Panel */}
          <div
            style={{
              padding: "18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h4 style={{ fontSize: 13.5, fontWeight: 800, margin: 0, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                🌱 Sustainability & Impact Metrics
              </h4>
              <Badge variant="organic">Verified Green Listing</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center" }}>
              <EcoScoreGauge score={product.ecoScore || 94} size={105} strokeWidth={9} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "var(--bg-soft)", padding: "8px 10px", borderRadius: 8 }}>
                  <span className="fc-soft" style={{ fontSize: 10, display: "block" }}>☁️ CO₂ SAVED</span>
                  <strong style={{ fontSize: 13, color: "var(--brand)" }}>{product.co2SavedKg || 4.5} kg</strong>
                </div>
                <div style={{ background: "var(--bg-soft)", padding: "8px 10px", borderRadius: 8 }}>
                  <span className="fc-soft" style={{ fontSize: 10, display: "block" }}>🥤 PLASTIC SAVED</span>
                  <strong style={{ fontSize: 13, color: "var(--brand)" }}>{product.plasticSavedKg || 1.2} kg</strong>
                </div>
                <div style={{ background: "var(--bg-soft)", padding: "8px 10px", borderRadius: 8 }}>
                  <span className="fc-soft" style={{ fontSize: 10, display: "block" }}>💧 WATER SAVED</span>
                  <strong style={{ fontSize: 13, color: "var(--brand)" }}>{product.waterSavedLiters || 25} L</strong>
                </div>
                <div style={{ background: "var(--bg-soft)", padding: "8px 10px", borderRadius: 8 }}>
                  <span className="fc-soft" style={{ fontSize: 10, display: "block" }}>🌳 TREES EQUIV.</span>
                  <strong style={{ fontSize: 13, color: "var(--brand)" }}>{product.treesEquivalent || 0.3}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ✨ Product Key Features Section (Side Panel) */}
          {productFeatures.length > 0 && (
            <div
              style={{
                padding: "18px",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px 0", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                ✨ Key Product Features
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {productFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      background: "var(--bg-soft)",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{feat.icon || "✓"}</span>
                    <div>
                      <strong style={{ fontSize: 13, color: "var(--text)", display: "block", marginBottom: 2 }}>{feat.title}</strong>
                      {feat.description && (
                        <span className="fc-soft" style={{ fontSize: 11.5, lineHeight: 1.4, display: "block" }}>
                          {feat.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                {formatCurrency(activeTierPrice || product.price)}
              </strong>
              <span className="fc-soft" style={{ fontSize: "14px" }}>
                /{product.unit}
              </span>
              {activeTierSavings > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: 4 }}>
                  {activeTierSavings}% OFF
                </span>
              )}
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
              <strong style={{ fontSize: 13.5 }}>{product.moq || 1} {product.unit}</strong>
            </div>
          </div>

          {/* Quantity Selector & Interactive Range Slider */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                Order Quantity ({product.unit}):
              </label>
              <span className="fc-soft" style={{ fontSize: "11px" }}>
                Subtotal: <strong>{formatCurrency((activeTierPrice || product.price) * quantity)}</strong>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <button
                className="fc-btn fc-btn-outline fc-btn-sm"
                onClick={() => setQuantity((q) => Math.max(product.moq || 1, q - 1))}
                disabled={quantity <= (product.moq || 1)}
                style={{ width: 36, height: 36, padding: 0, fontWeight: 800 }}
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(product.moq || 1, Math.min(product.stock || 9999, Number(e.target.value))))}
                min={product.moq || 1}
                max={product.stock}
                style={{
                  width: 80,
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
                onClick={() => setQuantity((q) => Math.min(product.stock || 9999, q + 1))}
                disabled={quantity >= (product.stock || 9999)}
                style={{ width: 36, height: 36, padding: 0, fontWeight: 800 }}
              >
                +
              </button>
              <input
                type="range"
                min={product.moq || 1}
                max={Math.min(200, product.stock || 200)}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--brand)", cursor: "pointer", height: 6 }}
              />
            </div>

            {/* Active Tier Discount Banner */}
            {activeTierSavings > 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#ecfdf5",
                  border: "1px solid #6ee7b7",
                  borderRadius: "6px",
                  fontSize: 11,
                  color: "#065f46",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>🎉 Bulk Tier Unlocked!</span>
                <span>Saving {activeTierSavings}% OFF ({formatCurrency(activeTierPrice)}/{product.unit})</span>
              </div>
            )}
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

            {/* AI Product Voice Explainer (Part 10 Feature 1) */}
            <div
              style={{
                marginTop: "12px",
                padding: "14px",
                background: "var(--brand-light)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--brand-border)",
                fontSize: "12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 800, color: "var(--brand-dark)", display: "flex", alignItems: "center", gap: "6px" }}>
                  🤖 EcoMart AI Voice Explainer
                </span>
                <button
                  type="button"
                  onClick={handleExplainProduct}
                  disabled={explainingAi}
                  style={{
                    padding: "5px 12px",
                    background: "var(--brand)",
                    color: "#ffffff",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 700,
                    border: "none",
                    cursor: explainingAi ? "default" : "pointer",
                    fontSize: "11px",
                    boxShadow: "var(--shadow-xs)"
                  }}
                >
                  {explainingAi ? "Generating..." : "🔊 Explain Product"}
                </button>
              </div>

              {aiExplanationText ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--text)",
                    lineHeight: 1.5,
                    fontWeight: 500,
                    background: "var(--surface)",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)"
                  }}
                >
                  {aiExplanationText}
                </p>
              ) : (
                <p style={{ margin: 0, color: "var(--text-soft)", fontSize: "11px" }}>
                  Click to hear a voice-guided summary of this product's EcoScore, materials, and environmental benefits.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>



      {/* BELOW SECTIONS: Tabs for Specs, Bulk Tiers, Grower Info, Reviews */}
      <Card style={{ padding: "26px", marginBottom: "36px", marginTop: "28px" }}>
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

            {/* Product Key Features Grid */}
            {productFeatures.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
                  ✨ Product Features & Highlights
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  {productFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--bg-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "12px 14px",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ fontSize: 20, lineHeight: 1 }}>{feat.icon || "✓"}</span>
                      <div>
                        <strong style={{ fontSize: 13, color: "var(--text)", display: "block", marginBottom: 2 }}>{feat.title}</strong>
                        {feat.description && (
                          <span className="fc-soft" style={{ fontSize: 12, lineHeight: 1.45, display: "block" }}>
                            {feat.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                <span className="fc-soft" style={{ display: "block", fontSize: 11 }}>MANUFACTURED DATE</span>
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

      {/* 🔍 Full-Screen Image Lightbox Modal */}
      {isLightboxOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.92)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Header Bar */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              right: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#fff",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>{product.name}</h3>
              <span style={{ fontSize: 13, opacity: 0.85 }}>
                {galleryItems[lightboxIndex]?.color ? `Variant: ${galleryItems[lightboxIndex].color} • ` : ""}
                Image {lightboxIndex + 1} of {galleryItems.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                color: "#fff",
                width: 42,
                height: 42,
                borderRadius: "50%",
                fontSize: 22,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              title="Close Full Screen (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Main Uncropped Image View */}
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "78vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryItems[lightboxIndex]?.imageUrl || mainImg}
              alt={product.name}
              style={{
                maxWidth: "90vw",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              }}
            />

            {/* Prev / Next Nav Buttons */}
            {galleryItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1))}
                  style={{
                    position: "absolute",
                    left: -24,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(255, 255, 255, 0.25)",
                    color: "#fff",
                    border: "none",
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    fontSize: 28,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                  }}
                  title="Previous Image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0))}
                  style={{
                    position: "absolute",
                    right: -24,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(255, 255, 255, 0.25)",
                    color: "#fff",
                    border: "none",
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    fontSize: 28,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                  }}
                  title="Next Image"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip inside Lightbox */}
          {galleryItems.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: 24,
                display: "flex",
                gap: 12,
                background: "rgba(0, 0, 0, 0.65)",
                padding: "8px 16px",
                borderRadius: "30px",
                backdropFilter: "blur(6px)",
                zIndex: 10000,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {galleryItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setSelectedImage(idx);
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: lightboxIndex === idx ? "2.5px solid #10b981" : "1px solid rgba(255,255,255,0.3)",
                    opacity: lightboxIndex === idx ? 1 : 0.6,
                    cursor: "pointer",
                    padding: "2px",
                    background: "rgba(255,255,255,0.1)",
                  }}
                >
                  <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ProductDetails = memo(ProductDetailsBase);
export default ProductDetails;

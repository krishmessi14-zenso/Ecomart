import { useState, useMemo, memo } from "react";
import { Cart, Heart, Edit, Trash, Check } from "../icons/Icons.jsx";
import { gradeColor } from "./gradeColor.js";
import { formatCurrency } from "../../utils/formatters.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { Avatar, Badge, Skeleton } from "../common/index.js";
import { getProductImage } from "../../utils/constants.js";

const APPROVAL_LABELS = {
  pending: { text: "⏳ Pending Approval", bg: "var(--warning)" },
  approved: { text: "✅ Approved", bg: "var(--brand)" },
  rejected: { text: "❌ Rejected", bg: "var(--danger)" }
};

function ProductCardBase({
  product,
  vendorName,
  region,
  mode = "customer",
  inWishlist,
  justAdded,
  onAdd,
  onToggleWishlist,
  onView,
  onEdit,
  onDelete,
  className = "",
  style = {},
}) {
  const { t } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  if (!product) return null;

  const color = gradeColor(product.grade);
  const bgImg = imageError ? getProductImage(null) : getProductImage(product);
  const ecoScore = product.ecoScore ?? 0;
  const approval = APPROVAL_LABELS[product.status];

  // Check if wholesale tiers exist
  const tierCount = useMemo(() => {
    try {
      const parsed = JSON.parse(product.tierPrices || "{}");
      return Object.keys(parsed).length;
    } catch {
      return 0;
    }
  }, [product.tierPrices]);

  const displayVendorName = vendorName || "EcoMart Vendor";
  const displayRegion = region || product.region || "";

  const handleAddToCart = (e) => {
    e.stopPropagation();
    setIsAdding(true);
    onAdd?.(product.id);
    setTimeout(() => {
      setIsAdding(false);
    }, 280);
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    setAnimateHeart(true);
    onToggleWishlist?.(product.id);
    setTimeout(() => setAnimateHeart(false), 260);
  };

  return (
    <div
      className={`fc-product-card fc-card-hoverable fc-fade-in ${className}`}
      style={style}
    >
      {/* Large Aspect-Ratio Image Header */}
      <div
        className="fc-product-thumb"
        style={{
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          height: 150,
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
          background: "var(--bg-soft)",
        }}
        onClick={() => onView?.(product)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${product.name}`}
      >
        {/* Loading Skeleton */}
        {!imageLoaded && !imageError && (
          <Skeleton height={150} width="100%" radius={0} style={{ position: "absolute", inset: 0, zIndex: 1 }} />
        )}

        {/* Product Image with Hover Scale Zoom */}
        <img
          src={bgImg}
          alt={product.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: imageLoaded ? 1 : 0,
          }}
          className="fc-product-thumb-img"
        />

        {/* Dark Gradient Overlay for Badges Readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)",
            zIndex: 2,
          }}
        />

        {/* Top Badges Overlay */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 3,
          }}
        >
          {product.organic === 1 && (
            <Badge variant="organic" />
          )}
          {ecoScore > 0 && (
            <span
              className="fc-status-badge"
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                background: "var(--info)",
                color: "#ffffff",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              🌍 ECO SCORE {ecoScore}
            </span>
          )}
          {tierCount > 0 && (
            <span
              className="fc-status-badge"
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                background: "var(--accent)",
                color: "#ffffff",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              🤝 BULK DISCOUNTS
            </span>
          )}
          {mode === "vendor" && approval && (
            <span
              className="fc-status-badge"
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                background: approval.bg,
                color: "#ffffff",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {approval.text}
            </span>
          )}
        </div>

        {/* Wishlist Button (Customer Mode) */}
        {mode === "customer" && (
          <button
            className={`fc-product-wish-btn ${animateHeart ? "fc-heart-pulse" : ""}`}
            onClick={handleWishlistClick}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            style={{
              zIndex: 4,
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
          >
            <Heart size={14} filled={inWishlist} />
          </button>
        )}

        {/* Add to Cart Confirmation Flash Banner */}
        {justAdded && (
          <div className="fc-added-flash fc-check-pop" style={{ zIndex: 5 }}>
            <Check size={11} /> {t("addedToCart")}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="fc-product-body" style={{ padding: "14px 16px 16px" }}>
        {/* Category & Grade Tags */}
        <div className="fc-product-tags" style={{ marginBottom: 6 }}>
          <span className="fc-tag-category">{product.category.toUpperCase()}</span>
          <span className="fc-tag-grade" style={{ background: color }}>
            Grade {product.grade}
          </span>
        </div>

        {/* Product Name */}
        <div
          className="fc-product-name"
          role="button"
          tabIndex={0}
          onClick={() => onView?.(product)}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "14.5px",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.3,
            cursor: "pointer",
            marginBottom: 4,
          }}
        >
          {product.name}
        </div>

        {/* Short Description (if available) */}
        {product.description && (
          <p
            className="fc-muted"
            style={{
              fontSize: "12px",
              lineHeight: 1.4,
              marginBottom: 10,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {product.description}
          </p>
        )}

        {/* Vendor Profile Row with Avatar & Verification Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: 12,
            padding: "4px 0",
          }}
        >
          <Avatar name={displayVendorName} size="sm" role="vendor" verified />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{displayVendorName}</span>
            </div>
            <div className="fc-soft" style={{ fontSize: "10.5px" }}>
              <span>📍 {[product.city || displayRegion || product.region, product.countryCode || "IN"].filter(Boolean).join(", ")}</span>
            </div>
          </div>
        </div>

        {/* Stock & MOQ Info Line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px",
            borderTop: "1px solid var(--border)",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <div>
            {t("stockLabel")}: <strong>{product.stock} {product.unit}</strong>
          </div>
          <div>
            MOQ: <strong>{product.moq || 1} {product.unit}</strong>
          </div>
        </div>

        {/* Footer: Prominent Price + Actions */}
        <div className="fc-product-footer" style={{ marginTop: 12 }}>
          <div className="fc-product-price">
            <strong style={{ fontFamily: "var(--font-heading)", fontSize: "16px", color: "var(--text)" }}>
              {formatCurrency(product.price, product.currency)}
            </strong>
            <span className="fc-soft" style={{ fontSize: "11.5px" }}>
              /{product.unit}
            </span>
          </div>

          {mode === "customer" ? (
            <button
              className={`fc-cart-btn ${justAdded ? "fc-btn-primary" : ""}`}
              onClick={handleAddToCart}
              aria-label="Add MOQ to cart"
              title="Add MOQ to cart"
              style={{ transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              {isAdding ? (
                <span style={{ fontSize: 11, fontWeight: 700 }}>...</span>
              ) : justAdded ? (
                <Check size={14} className="fc-check-pop" />
              ) : (
                <Cart size={14} />
              )}
            </button>
          ) : (
            <div className="fc-flex-gap-8">
              <button
                className="fc-icon-btn"
                onClick={() => onEdit?.(product)}
                aria-label="Edit product listing"
                title="Edit product"
              >
                <Edit size={14} />
              </button>
              <button
                className="fc-icon-btn"
                style={{ color: "var(--danger)" }}
                onClick={() => onDelete?.(product)}
                aria-label="Delete product listing"
                title="Delete product"
              >
                <Trash size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardBase);
export default ProductCard;

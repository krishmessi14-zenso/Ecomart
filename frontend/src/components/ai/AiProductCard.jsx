import { useState } from "react";
import { useCart } from "../../hooks/useCart";
import { getProductImage } from "../../utils/constants.js";

export function AiProductCard({ product, onNavigateProduct }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const displayImg = imageError ? getProductImage(null) : getProductImage(product);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      onClick={() => onNavigateProduct && onNavigateProduct(product.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        margin: "6px 0"
      }}
    >
      <img
        src={displayImg}
        alt={product.name}
        onError={() => setImageError(true)}
        style={{
          width: "48px",
          height: "48px",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {product.name}
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--brand)" }}>
            ₹{product.price}
          </span>
          {product.ecoScore && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                background: "var(--brand-light)",
                color: "var(--brand-dark)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid var(--brand-border)"
              }}
            >
              🌱 EcoScore {product.ecoScore}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAddToCart}
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 700,
          borderRadius: "var(--radius-sm)",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          background: added ? "var(--brand)" : "var(--bg-soft)",
          color: added ? "#ffffff" : "var(--brand-dark)"
        }}
      >
        {added ? "Added ✓" : "+ Add"}
      </button>
    </div>
  );
}

export default AiProductCard;

import { useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "../../components/product/ProductCard.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Heart } from "../../components/icons/Icons.jsx";
import { useData } from "../../hooks/useData.js";
import { useCart } from "../../hooks/useCart.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";

function WishlistBase() {
  const { t } = useLanguage();
  const { products } = useData();
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const { notifySuccess } = useNotifications();
  const navigate = useNavigate();

  const items = useMemo(() => products.filter((p) => wishlist.includes(p.id)), [products, wishlist]);
  // Vendor/store name and region are denormalized directly onto each product row,
  // so no separate lookup table (real or fake) is needed here.
  const vendorName = useCallback((product) => product.storeName || product.city || "EcoMart Vendor", []);
  const vendorRegion = useCallback((product) => product.region || "", []);

  const handleAdd = useCallback((id) => {
    addToCart(id, 10);
    notifySuccess(t("addedToCart"));
  }, [addToCart, notifySuccess, t]);

  const handleRemove = useCallback((id) => {
    toggleWishlist(id);
    notifySuccess(t("removedFromWishlist"));
  }, [toggleWishlist, notifySuccess, t]);

  return (
    <div className="fc-page-transition">
      <h1 className="fc-h1 fc-mb-24">{t("wishlist")}</h1>
      {items.length === 0 ? (
        <EmptyState icon={<Heart size={26} />} title={t("emptyWishlist")}
          action={<Button variant="primary" onClick={() => navigate("/customer/marketplace")}>{t("browseMarketplace")}</Button>} />
      ) : (
        <div className="fc-product-grid">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} vendorName={vendorName(p)} region={vendorRegion(p)} mode="customer" inWishlist
              onAdd={handleAdd} onToggleWishlist={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

export const Wishlist = memo(WishlistBase);
export default Wishlist;

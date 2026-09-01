import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../components/common/StatCard.jsx";
import { OnboardingModal } from "../../components/common/OnboardingModal.jsx";
import { ShoppingBag, Heart, Cart, ClipboardList, TrendingUp, Info } from "../../components/icons/Icons.jsx";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { useData } from "../../hooks/useData.js";
import { useCart } from "../../hooks/useCart.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { Button } from "../../components/common/Button.jsx";

function CustomerDashboardBase() {
  const { t, lang } = useLanguage();
  const { user: currentUser } = useAuth();
  const { orders, products } = useData();
  const { cart, wishlist } = useCart();
  const navigate = useNavigate();

  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    try {
      const shown = localStorage.getItem("fc_customer_onboarding_done");
      if (!shown) {
        setOnboardingOpen(true);
        localStorage.setItem("fc_customer_onboarding_done", "true");
      }
    } catch {
      /* noop */
    }
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const myOrders = useMemo(() => {
    return orders.filter((o) => o.customerId === currentUser?.id || o.customerName === currentUser?.name);
  }, [orders, currentUser]);

  const spentAmount = useMemo(
    () => myOrders.filter((o) => o.status === "Delivered" || o.status === "Accepted").reduce((s, o) => s + o.amount, 0),
    [myOrders]
  );

  const completedOrders = useMemo(
    () => myOrders.filter((o) => o.status === "Delivered").length,
    [myOrders]
  );

  const recentOrders = useMemo(
    () => myOrders.slice(0, 5),
    [myOrders]
  );

  const cartCount = useMemo(
    () => cart.reduce((s, c) => s + c.qty, 0),
    [cart]
  );

  const productName = (id) => products.find((p) => p.id === id)?.name || "—";

  // ---------------- ECO IMPACT & GREEN REWARDS ----------------

  const [greenPoints, setGreenPoints] = useState(currentUser?.greenPoints || 0);
  const [coupons, setCoupons] = useState([]);
  const [redeemMsg, setRedeemMsg] = useState("");

  useEffect(() => {
    setGreenPoints(currentUser?.greenPoints || 0);
  }, [currentUser]);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) setCoupons(await res.json());
    } catch (err) {
      console.error("Failed to load coupons:", err);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleRedeem = useCallback(async (couponId) => {
    setRedeemMsg("");
    try {
      const res = await fetch(`/api/coupons/${couponId}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: currentUser?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setGreenPoints(data.user.greenPoints);
        setRedeemMsg(`✅ Redeemed! Use code ${data.coupon.code} at checkout.`);
      } else {
        setRedeemMsg(`⚠️ ${data.error}`);
      }
    } catch (err) {
      console.error("Redeem failed:", err);
    }
  }, [currentUser]);

  // Sum the real per-unit Eco Impact of every item across this customer's delivered orders
  const ecoImpact = useMemo(() => {
    const totals = { co2SavedKg: 0, plasticSavedKg: 0, waterSavedLiters: 0, treesEquivalent: 0 };
    myOrders.forEach((o) => {
      const prod = products.find((p) => p.id === o.productId);
      if (!prod) return;
      const qty = o.qty || 1;
      totals.co2SavedKg += (prod.co2SavedKg || 0) * qty;
      totals.plasticSavedKg += (prod.plasticSavedKg || 0) * qty;
      totals.waterSavedLiters += (prod.waterSavedLiters || 0) * qty;
      totals.treesEquivalent += (prod.treesEquivalent || 0) * qty;
    });
    return {
      co2SavedKg: totals.co2SavedKg.toFixed(1),
      plasticSavedKg: totals.plasticSavedKg.toFixed(1),
      waterSavedLiters: Math.round(totals.waterSavedLiters),
      treesEquivalent: totals.treesEquivalent.toFixed(2),
    };
  }, [myOrders, products]);

  // ---------------- INTELLIGENCE INSIGHTS ----------------

  // 1. Reorder suggestions
  const reorderSuggestions = useMemo(() => {
    const delivered = myOrders.filter(o => o.status === "Delivered");
    if (delivered.length === 0) return [];
    
    // Group by product
    const productFrequency = {};
    delivered.forEach(o => {
      productFrequency[o.productId] = (productFrequency[o.productId] || 0) + 1;
    });

    const sorted = Object.entries(productFrequency).sort((a, b) => b[1] - a[1]);
    const topProdId = sorted[0]?.[0];
    const topProd = products.find(p => p.id === topProdId);
    
    if (topProd) {
      const pastOrdersForProd = delivered.filter(o => o.productId === topProdId);
      const avgQty = Math.round(pastOrdersForProd.reduce((sum, o) => sum + o.qty, 0) / pastOrdersForProd.length);
      return [{
        productId: topProd.id,
        name: topProd.name,
        qty: avgQty,
        unit: topProd.unit,
        text: `Frequent Purchase: Need more ${topProd.name}? Buy your average quantity of ${avgQty} ${topProd.unit} again.`
      }];
    }
    return [];
  }, [myOrders, products]);

  // 2. Platform category price guides
  const priceGuides = useMemo(() => {
    const categories = [...new Set(products.map(p => p.category))];
    const sums = {};
    const counts = {};
    products.forEach(p => {
      sums[p.category] = (sums[p.category] || 0) + p.price;
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    return categories.map(cat => {
      const avg = sums[cat] / counts[cat];
      const items = products.filter(p => p.category === cat).sort((a, b) => a.price - b.price);
      const cheapest = items[0];
      if (!cheapest) return null;
      
      const diffPct = Math.round(((avg - cheapest.price) / avg) * 100);
      if (diffPct > 10) {
        return {
          category: cat,
          text: `💰 Deal Alert in ${cat}: ${cheapest.name} is listed at ₹${cheapest.price}/${cheapest.unit} (${diffPct}% below category average ₹${avg.toFixed(0)}).`
        };
      }
      return null;
    }).filter(Boolean).slice(0, 2);
  }, [products]);

  // 3. Recommended products based on past categories bought
  const recommendedProducts = useMemo(() => {
    const purchasedCategories = new Set();
    myOrders.forEach(o => {
      const prod = products.find(p => p.id === o.productId);
      if (prod) purchasedCategories.add(prod.category);
    });

    // If no past purchases, recommend random Grade A products
    const targetCats = purchasedCategories.size > 0 ? Array.from(purchasedCategories) : ["Vegetables"];
    
    return products.filter(p => {
      // Find products in their categories that they haven't bought recently
      const alreadyBought = myOrders.some(o => o.productId === p.id);
      return targetCats.includes(p.category) && !alreadyBought && p.grade === "A";
    }).slice(0, 3);
  }, [myOrders, products]);

  return (
    <div className="fc-page-transition">
      <div className="fc-dashboard-hero" style={{ background: "var(--gradient-accent)", padding: "20px", borderRadius: "var(--radius-md)", color: "#fff", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "22px", margin: 0 }}>Good morning, {currentUser?.name || "Customer"}!</h2>
            <p style={{ margin: "4px 0 0 0", opacity: 0.85 }}>Your shopping summary at a glance. • Updated {now.toLocaleTimeString(lang === "en" ? "en-IN" : lang, { hour: "2-digit", minute: "2-digit" })}.</p>
          </div>
          <Button variant="outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)" }} onClick={() => navigate("/customer/marketplace")}>
            {t("browseMarketplace") || "Browse Marketplace"}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="fc-stat-grid" style={{ marginBottom: "24px" }}>
        <StatCard label={t("spentAmount") || "Total Spent"} value={formatCurrency(spentAmount)} icon={<TrendingUp size={18} />} color="var(--accent)" bg="var(--accent-light)" />
        <StatCard label={t("completedOrders") || "Completed Orders"} value={completedOrders} icon={<ClipboardList size={18} />} color="var(--brand)" bg="var(--brand-light)" />
        <StatCard label={t("itemsInCart") || "Items in Cart"} value={`${cartCount} units`} icon={<Cart size={18} />} color="var(--info)" bg="var(--info-light)" />
        <StatCard label={t("wishlistedItems") || "Wishlisted Items"} value={wishlist.length} icon={<Heart size={18} />} color="var(--danger)" bg="var(--danger-light)" />
      </div>

      {/* Eco Impact & Green Reward Points */}
      <div className="fc-panel" style={{ marginBottom: "24px" }}>
        <div className="fc-forecast-header" style={{ marginBottom: 16 }}>
          <h3 className="fc-h3">🌍 My Eco Dashboard</h3>
          <p className="fc-muted fc-mt-4">Your real environmental impact and Green Reward Points, calculated from your actual orders.</p>
        </div>

        <div className="fc-stat-grid" style={{ marginBottom: 16 }}>
          <StatCard label="CO₂ Saved" value={`${ecoImpact.co2SavedKg} kg`} icon={<Info size={18} />} color="var(--brand)" bg="var(--brand-light)" />
          <StatCard label="Plastic Avoided" value={`${ecoImpact.plasticSavedKg} kg`} icon={<Info size={18} />} color="var(--info)" bg="var(--info-light)" />
          <StatCard label="Water Saved" value={`${ecoImpact.waterSavedLiters} L`} icon={<Info size={18} />} color="var(--accent)" bg="var(--accent-light)" />
          <StatCard label="Green Reward Points" value={greenPoints} icon={<TrendingUp size={18} />} color="#166534" bg="#ecfdf5" />
        </div>

        <div style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-md)" }}>
          <h4 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>Redeem Green Points for Rewards</h4>
          {redeemMsg && <p style={{ fontSize: 12, marginBottom: 10 }}>{redeemMsg}</p>}
          {coupons.length === 0 ? (
            <p className="fc-soft" style={{ fontStyle: "italic", fontSize: 12 }}>No rewards available right now.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {coupons.map((c) => (
                <div key={c.id} style={{ background: "var(--bg-elevated)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <strong style={{ fontSize: 13, color: "var(--brand)" }}>{c.code}</strong>
                  <p style={{ fontSize: 11.5, margin: "4px 0 8px 0" }}>{c.description}</p>
                  <Button
                    variant={greenPoints >= c.pointsRequired ? "primary" : "outline"}
                    size="sm"
                    disabled={greenPoints < c.pointsRequired}
                    onClick={() => handleRedeem(c.id)}
                  >
                    Redeem for {c.pointsRequired} pts
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shopping Insights Advisor */}
      <div className="fc-panel" style={{ marginBottom: "24px" }}>
        <div className="fc-forecast-header" style={{ marginBottom: 16 }}>
          <h3 className="fc-h3">📈 Shopping Insights</h3>
          <p className="fc-muted fc-mt-4">Pricing deals and reorder suggestions based on your purchase history.</p>
        </div>

        <div className="fc-grid-2" style={{ gap: "20px" }}>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px", color: "var(--brand-dark)" }}>Purchases & Pricing Advisor</h4>
            
            {reorderSuggestions.map(s => (
              <div key={s.productId} className="fc-ai-advisory-card" style={{ borderLeft: "4px solid var(--accent)", background: "var(--accent-light)", padding: "12px", borderRadius: 6, marginBottom: 10 }}>
                <strong style={{ fontSize: 13, color: "var(--accent)" }}>🔄 Quick Reorder Alert</strong>
                <p style={{ fontSize: 12, margin: "4px 0 0 0", color: "#444" }}>{s.text}</p>
                <div style={{ marginTop: 8 }}>
                  <Button variant="accent" size="sm" onClick={() => { cart.push({ productId: s.productId, qty: s.qty }); navigate("/customer/cart"); }}>
                    Add {s.qty} {s.unit} to Cart
                  </Button>
                </div>
              </div>
            ))}

            {priceGuides.map((guide, idx) => (
              <div key={idx} className="fc-ai-advisory-card" style={{ borderLeft: "4px solid var(--brand)", background: "var(--brand-light)", padding: "10px", borderRadius: 6, marginBottom: 8 }}>
                <strong style={{ fontSize: 12, color: "var(--brand)" }}>💡 Procurement Deal</strong>
                <p style={{ fontSize: 11, margin: "4px 0 0 0", color: "var(--text)" }}>{guide.text}</p>
              </div>
            ))}

            {reorderSuggestions.length === 0 && priceGuides.length === 0 && (
              <p className="fc-soft" style={{ fontStyle: "italic", fontSize: 12 }}>No pricing alerts or reorder suggestions yet. Place a few orders to unlock personalized recommendations.</p>
            )}
          </div>

          <div style={{ background: "var(--bg-soft)", padding: "16px", borderRadius: "var(--radius-md)" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px", color: "var(--text)" }}>Recommended Products (Grade A)</h4>
            
            {recommendedProducts.length === 0 ? (
              <p className="fc-soft" style={{ fontStyle: "italic", fontSize: 12 }}>All Grade A items are already in your cart or order history.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recommendedProducts.map(p => (
                  <div 
                    key={p.id} 
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      background: "var(--bg-elevated)", 
                      padding: 10, 
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      cursor: "pointer"
                    }}
                    onClick={() => navigate(`/customer/marketplace`)}
                  >
                    <div>
                      <strong style={{ fontSize: 12 }}>{p.name}</strong>
                      <div className="fc-soft" style={{ fontSize: 10, marginTop: 2 }}>{p.category} • Grade {p.grade}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: 12, color: "var(--brand)" }}>{formatCurrency(p.price)}</strong>/{p.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Shortcuts + Recent Orders */}
      <div className="fc-grid-2">
        <div className="fc-panel">
          <div className="fc-panel-head">
            <h3 className="fc-h3">Workspace Shortcuts</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "10px" }}>
            <button className="fc-card fc-card-pad fc-card-hoverable" onClick={() => navigate("/customer/marketplace")} style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ color: "var(--brand)", marginBottom: "8px" }}><ShoppingBag size={20} /></div>
              <strong>{t("marketplace")}</strong>
              <p className="fc-muted" style={{ fontSize: "11px", marginTop: "4px" }}>Order sustainable products directly</p>
            </button>
            <button className="fc-card fc-card-pad fc-card-hoverable" onClick={() => navigate("/customer/cart")} style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ color: "var(--info)", marginBottom: "8px" }}><Cart size={20} /></div>
              <strong>{t("cart")}</strong>
              <p className="fc-muted" style={{ fontSize: "11px", marginTop: "4px" }}>Manage current basket</p>
            </button>
            <button className="fc-card fc-card-pad fc-card-hoverable" onClick={() => navigate("/customer/wishlist")} style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ color: "var(--danger)", marginBottom: "8px" }}><Heart size={20} /></div>
              <strong>{t("wishlist")}</strong>
              <p className="fc-muted" style={{ fontSize: "11px", marginTop: "4px" }}>Lots saved for later</p>
            </button>
            <button className="fc-card fc-card-pad fc-card-hoverable" onClick={() => navigate("/customer/orders")} style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ color: "var(--accent)", marginBottom: "8px" }}><ClipboardList size={20} /></div>
              <strong>{t("orderHistory")}</strong>
              <p className="fc-muted" style={{ fontSize: "11px", marginTop: "4px" }}>Review your order history</p>
            </button>
          </div>
        </div>

        <div className="fc-panel">
          <div className="fc-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="fc-h3">Recent Orders</h3>
            {myOrders.length > 5 && (
              <button className="fc-link-btn" onClick={() => navigate("/customer/orders")}>
                View All
              </button>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-soft)" }}>
              No orders placed yet.
            </div>
          ) : (
            <div className="fc-table-wrap" style={{ marginTop: "12px" }}>
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Order Group ID</th>
                    <th>Product</th>
                    <th>Subtotal</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.itemId}>
                      <td>
                        <button className="fc-link-btn" onClick={() => navigate(`/customer/tracking/${o.id}`)} style={{ fontSize: "13px", fontWeight: "bold" }}>
                          {o.id}
                        </button>
                      </td>
                      <td>{productName(o.productId)}</td>
                      <td>{formatCurrency(o.amount)}</td>
                      <td>
                        <span className={`fc-status-badge fc-status-${o.status.replace(/\s+/g, "").toLowerCase()}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
}

export const CustomerDashboard = memo(CustomerDashboardBase);
export default CustomerDashboard;

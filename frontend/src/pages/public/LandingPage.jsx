import { memo, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Tractor, Store, ShoppingBag, Check, ShieldCheck, Star } from "../../components/icons/Icons.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Avatar } from "../../components/common/Avatar.jsx";
import { useLanguage } from "../../hooks/useLanguage.js";
import PublicHeader from "../../components/layout/PublicHeader.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { formatCurrency } from "../../utils/formatters.js";
import { CATEGORY_IMAGES } from "../../utils/constants.js";



const TESTIMONIALS = [
  {
    name: "Ananya Deshmukh",
    role: "Founder, Ananya's Gourmet Kitchens",
    text: "EcoMart gives our restaurant complete supply confidence. Harvests arrive fresh, and the wholesale tiers help our margins.",
    rating: 5,
    avatar: "AD"
  },
  {
    name: "Suresh Gowda",
    role: "Producer, Gowda Organic Stores",
    text: "Listing our products on EcoMart gives us direct access to eco-conscious customers. We set fair prices and receive orders promptly.",
    rating: 5,
    avatar: "SG"
  },
  {
    name: "Vikram Ahluwalia",
    role: "Head of Procurement, Le Mer Hotels",
    text: "We source Grade A products directly from verified stores at better costs. The platform transparency is exactly what procurement teams need.",
    rating: 5,
    avatar: "VA"
  }
];

function LandingPageBase() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [platformStats, setPlatformStats] = useState({ vendors: 0, products: 0, orders: 0 });

  useEffect(() => {
    // Fetch real platform data for stats
    const fetchData = async () => {
      try {
        const [prodRes, orderRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/orders")
        ]);
        if (prodRes.ok) {
          const products = await prodRes.json();
          setFeaturedProducts(products.slice(0, 4));
          const vendorIds = new Set(products.map(p => p.vendorId));
          setPlatformStats(prev => ({ ...prev, products: products.length, vendors: vendorIds.size }));
        }
        if (orderRes.ok) {
          const orders = await orderRes.json();
          const uniqueOrders = new Set(orders.map(o => o.id));
          setPlatformStats(prev => ({ ...prev, orders: uniqueOrders.size }));
        }
      } catch {
        // Use fallback zeros
      }
    };
    fetchData();
  }, []);

  const goLogin = useCallback(() => navigate("/login"), [navigate]);
  const goRegister = useCallback(() => navigate("/register"), [navigate]);

  return (
    <div className="fc-app">
      <PublicHeader />
      <main style={{ flex: 1 }}>
        {/* ===== HERO ===== */}
        <section className="fc-hero-landing">
          <div className="fc-hero-inner">
            <div className="fc-hero-eyebrow">
              <Sprout size={14} />
              <span>SUSTAINABLE E-COMMERCE MARKETPLACE</span>
            </div>
            <h1 className="fc-hero-title">
              Sustainable Products for an Eco-Friendly Lifestyle.
            </h1>
            <p className="fc-hero-subtitle">
              EcoMart connects verified vendors with businesses and customers through transparent products listings, fair pricing, and reliable order fulfillment.
            </p>
            <div className="fc-hero-actions">
              <Button size="lg" className="fc-hero-btn-primary" onClick={goLogin}>
                Explore Marketplace
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="fc-hero-btn-secondary"
                onClick={goRegister}
              >
                List Your Products
              </Button>
            </div>
          </div>
        </section>

        <div className="fc-container">
          {/* ===== TRUST STRIP ===== */}
          <div className="fc-trust-strip">
            <div className="fc-trust-item">
              <div className="fc-trust-icon-box">
                <ShieldCheck size={20} />
              </div>
              <div className="fc-trust-text">
                <div className="fc-trust-title">Verified Vendors</div>
                <div className="fc-trust-desc">Trusted producers on EcoMart</div>
              </div>
            </div>

            <div className="fc-trust-item">
              <div className="fc-trust-icon-box">
                <Check size={20} />
              </div>
              <div className="fc-trust-text">
                <div className="fc-trust-title">Transparent Pricing</div>
                <div className="fc-trust-desc">Clear pricing at every listing</div>
              </div>
            </div>

            <div className="fc-trust-item">
              <div className="fc-trust-icon-box">
                <Sprout size={20} />
              </div>
              <div className="fc-trust-text">
                <div className="fc-trust-title">Sustainable Products Listings</div>
                <div className="fc-trust-desc">Source directly from active harvests</div>
              </div>
            </div>

            <div className="fc-trust-item">
              <div className="fc-trust-icon-box">
                <Store size={20} />
              </div>
              <div className="fc-trust-text">
                <div className="fc-trust-title">Reliable Order Tracking</div>
                <div className="fc-trust-desc">Track every order from placement to delivery</div>
              </div>
            </div>
          </div>

          {/* ===== HOW IT WORKS ===== */}
          <section className="fc-section fc-text-center">
            <h2 className="fc-section-title" style={{ textAlign: "center" }}>How EcoMart Works</h2>
            <p className="fc-section-subtitle" style={{ textAlign: "center", margin: "0 auto var(--space-8)" }}>
              A simple, transparent process for buying and selling sustainable products.
            </p>
            <div className="fc-steps-grid">
              {[
                { num: "1", title: "Vendors List Products", desc: "Upload product details, set fair prices, and manage availability." },
                { num: "2", title: "Customers Discover products", desc: "Browse verified listings, compare grades, and check wholesale tiers." },
                { num: "3", title: "Customer Places Order", desc: "Select quantities, review pricing, and confirm procurement orders." },
                { num: "4", title: "Vendor Fulfills Order", desc: "Process, pack, and deliver sustainable products directly to customers." },
              ].map((step) => (
                <div key={step.num} className="fc-step-card">
                  <div className="fc-step-number">{step.num}</div>
                  <div className="fc-step-title">{step.title}</div>
                  <div className="fc-step-desc">{step.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== FEATURED products ===== */}
          {featuredProducts.length > 0 && (
            <section className="fc-section">
              <h2 className="fc-section-title">Featured products</h2>
              <p className="fc-section-subtitle">Fresh listings from verified stores.</p>
              <div className="fc-product-grid">
                {featuredProducts.map((p) => {
                  const imgSrc = CATEGORY_IMAGES[p.category] || "/images/ecomart-products.jpg";
                  return (
                    <div key={p.id} className="fc-product-card fc-card-hoverable">
                      <div className="fc-product-thumb">
                        <img
                          src={imgSrc}
                          alt={p.name}
                          className="fc-product-thumb-img"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                      <div className="fc-product-body">
                        <div className="fc-product-tags">
                          <span className="fc-tag-category">{p.category}</span>
                          <span className="fc-tag-grade" style={{ background: p.grade === "A" ? "var(--brand)" : "var(--accent)" }}>
                            Grade {p.grade}
                          </span>
                        </div>
                        <div className="fc-product-name">{p.name}</div>
                        <div className="fc-product-footer">
                          <div className="fc-product-price">
                            <strong>{formatCurrency(p.price)}</strong>
                            <span className="fc-product-price-unit"> /{p.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}



          {/* ===== WHY ECOMART ===== */}
          <section className="fc-section">
            <h2 className="fc-section-title">Why EcoMart</h2>
            <p className="fc-section-subtitle">Built for vendors, customers, and eco-conscious businesses.</p>
            <div className="fc-feature-grid">
              {[
                { icon: <ShieldCheck size={22} />, title: "Verified Vendors", desc: "Every vendor undergoes identity and sustainability verification before listing." },
                { icon: <Store size={22} />, title: "Direct Trade", desc: "No middlemen. Fair prices for vendors, better costs for customers." },
                { icon: <ShoppingBag size={22} />, title: "Transparent Pricing", desc: "See actual prices with wholesale tier discounts upfront." },
                { icon: <Check size={22} />, title: "Quality Graded", desc: "All products is graded for transparent quality standards." },
                { icon: <Store size={22} />, title: "Sustainable Product Listings", desc: "Products listed with Eco Score, pricing, and availability info." },
                { icon: <Sprout size={22} />, title: "Reliable Fulfillment", desc: "Track orders from confirmation through delivery." },
              ].map((f, i) => (
                <div key={i} className="fc-feature-card">
                  <div className="fc-feature-icon">{f.icon}</div>
                  <h3 className="fc-h3" style={{ marginBottom: 8 }}>{f.title}</h3>
                  <p className="fc-muted">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== ROLE SELECTION ===== */}
          <section className="fc-section fc-text-center">
            <h2 className="fc-section-title" style={{ textAlign: "center" }}>Get Started with EcoMart</h2>
            <p className="fc-section-subtitle" style={{ textAlign: "center", margin: "0 auto var(--space-6)" }}>
              Choose how you'd like to use the platform.
            </p>
            <div className="fc-role-select-grid">
              <div className="fc-role-card" onClick={goRegister} role="button" tabIndex={0}>
                <div className="fc-role-card-icon" style={{ background: "var(--gradient-hero)" }}>
                  <Tractor size={26} />
                </div>
                <h3 className="fc-h2" style={{ marginBottom: 8 }}>I'm a Vendor</h3>
                <p className="fc-muted" style={{ marginBottom: 16 }}>
                  List your products, reach eco-conscious customers, and manage direct sales.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {["List products with pricing", "Reach eco-conscious customers", "Track orders and earnings"].map((b, i) => (
                    <li key={i} className="fc-flex-gap-8" style={{ marginBottom: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                      <Check size={14} style={{ color: "var(--brand)", flexShrink: 0 }} /> {b}
                    </li>
                  ))}
                </ul>
                <Button variant="primary" className="fc-mt-4" style={{ width: "100%" }}>
                  Register as Vendor
                </Button>
              </div>
              <div className="fc-role-card" onClick={goRegister} role="button" tabIndex={0}>
                <div className="fc-role-card-icon" style={{ background: "var(--gradient-accent)" }}>
                  <Store size={26} />
                </div>
                <h3 className="fc-h2" style={{ marginBottom: 8 }}>I'm a Customer</h3>
                <p className="fc-muted" style={{ marginBottom: 16 }}>
                  Discover sustainable products, compare listings, and manage procurement.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {["Browse verified products listings", "Wholesale pricing tiers", "Order tracking and history"].map((b, i) => (
                    <li key={i} className="fc-flex-gap-8" style={{ marginBottom: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                      <Check size={14} style={{ color: "var(--accent)", flexShrink: 0 }} /> {b}
                    </li>
                  ))}
                </ul>
                <Button variant="accent" className="fc-mt-4" style={{ width: "100%" }}>
                  Register as Customer
                </Button>
              </div>
            </div>
          </section>

          {/* ===== TESTIMONIALS ===== */}
          <section className="fc-section">
            <h2 className="fc-section-title">What Our Users Say</h2>
            <p className="fc-section-subtitle">Trusted by vendors and customers across India.</p>
            <div className="fc-testimonial-grid">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="fc-testimonial-card">
                  <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} size={14} style={{ color: "var(--accent)" }} />
                    ))}
                  </div>
                  <p className="fc-testimonial-text">"{t.text}"</p>
                  <div className="fc-testimonial-author">
                    <Avatar name={t.name} size={36} />
                    <div>
                      <div className="fc-testimonial-name">{t.name}</div>
                      <div className="fc-testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== FINAL CTA ===== */}
          <section className="fc-section fc-text-center" style={{ padding: "48px 24px", background: "var(--bg-soft)", borderRadius: "var(--radius-lg)", marginBottom: "var(--space-10)" }}>
            <h2 className="fc-h1" style={{ marginBottom: 12 }}>Ready to Transform Your Supply Chain?</h2>
            <p className="fc-body-lg" style={{ marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>
              Join EcoMart today and experience direct sustainable e-commerce.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" size="lg" onClick={goRegister}>
                Create Free Account
              </Button>
              <Button variant="outline" size="lg" onClick={goLogin}>
                Sign In
              </Button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const LandingPage = memo(LandingPageBase);
export default LandingPage;

import { useState, useReducer, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Card } from "../../components/common/Card.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { CreditCard, Truck as TruckIcon, Check, ArrowLeft, ShieldCheck, MapPin } from "../../components/icons/Icons.jsx";
import { formatCurrency, getActivePrice } from "../../utils/formatters.js";
import { validateCheckoutForm } from "../../utils/validators.js";
import { useData } from "../../hooks/useData.js";
import { useCart } from "../../hooks/useCart.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { GlobalLocationSelector } from "../../components/common/GlobalLocationSelector.jsx";

const initialCheckoutState = {
  form: {
    fullName: "Ananya Deshmukh",
    phone: "9876543210",
    address: "Unit 402, Gourmet Kitchen Hub, Andheri East",
    payment: "cod",
  },
  errors: {},
  submitting: false,
};

function checkoutReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: null },
      };
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "START_SUBMIT":
      return { ...state, submitting: true };
    case "SUBMIT_COMPLETE":
      return { ...state, submitting: false };
    default:
      return state;
  }
}

function CheckoutBase() {
  const { t } = useLanguage();
  const { products, placeOrder } = useData();
  const { cart, clearCart } = useCart();
  const { user: currentUser } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState(null);

  const [deliveryLocation, setDeliveryLocation] = useState({
    countryCode: "IN",
    countryName: "India",
    region: "Maharashtra",
    district: "Mumbai",
    city: "Andheri",
    address: "Unit 402, Gourmet Kitchen Hub, Andheri East",
    postalCode: "400069",
    currency: "INR"
  });

  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  const { form, errors, submitting } = state;

  const lines = useMemo(() => {
    return cart
      .map((c) => {
        const prod = products.find((p) => p.id === c.productId);
        if (!prod) return null;
        const activePrice = getActivePrice(prod, c.qty);
        return {
          ...c,
          product: prod,
          activePrice,
          amount: c.qty * activePrice,
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.amount, 0), [lines]);
  const deliveryFee = subtotal > 0 ? 500 : 0;
  const total = subtotal + deliveryFee;

  const handleChange = useCallback((field, value) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) {
      dispatch({ type: "SET_ERRORS", errors: { fullName: "Full name and phone are required." } });
      return;
    }
    setStep(2);
  };

  const handleFinalCheckout = async () => {
    if (lines.length === 0) return;

    for (const l of lines) {
      if (l.product.stock < l.qty) {
        notifyError(`Insufficient stock for ${l.product.name}. Available stock: ${l.product.stock}`);
        return;
      }
    }

    dispatch({ type: "START_SUBMIT" });

    const formattedDeliveryAddress = [
      deliveryLocation.address || form.address,
      deliveryLocation.city,
      deliveryLocation.district,
      deliveryLocation.region,
      deliveryLocation.countryName || "India",
      deliveryLocation.postalCode
    ].filter(Boolean).join(", ");

    const payload = {
      customerId: currentUser?.id || "v1",
      customerName: currentUser?.name || "Ananya's Kitchen",
      deliveryCountry: deliveryLocation.countryName || "India",
      deliveryRegion: deliveryLocation.region || "",
      deliveryDistrict: deliveryLocation.district || "",
      deliveryCity: deliveryLocation.city || "",
      deliveryPostalCode: deliveryLocation.postalCode || "",
      deliveryAddress: formattedDeliveryAddress,
      paymentMethod: form.payment,
      totalAmount: total,
      currency: deliveryLocation.currency || "INR",
      items: lines.map((l) => ({
        productId: l.product.id,
        vendorId: l.product.vendorId,
        qty: l.qty,
        unitPrice: l.activePrice,
        amount: l.amount,
      })),
    };

    try {
      const created = await placeOrder(payload);
      clearCart();
      notifySuccess("B2B Consolidated Order placed successfully!");
      setCompletedOrder(created || { id: `FC-${Math.floor(Math.random() * 9000 + 1000)}` });
      setStep(4);
    } catch (err) {
      console.error(err);
      notifyError("Failed to checkout B2B order.");
    } finally {
      dispatch({ type: "SUBMIT_COMPLETE" });
    }
  };

  if (step !== 4 && lines.length === 0) {
    return (
      <div className="fc-page-transition" style={{ padding: "40px 0" }}>
        <h1 className="fc-h1 fc-mb-24">{t("checkout")}</h1>
        <p className="fc-muted">
          Your cart is currently empty.{" "}
          <button className="fc-link-btn" onClick={() => navigate("/customer/marketplace")}>
            {t("browseMarketplace")}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="fc-page-transition">
      <h1 className="fc-h1 fc-mb-24">{t("checkout")}</h1>

      {/* Multi-Step Checkout Progress Indicator Header */}
      <Card style={{ padding: "18px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          {[
            { num: 1, label: "Step 1: Address" },
            { num: 2, label: "Step 2: Review" },
            { num: 3, label: "Step 3: Payment" },
            { num: 4, label: "Step 4: Complete" },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: isActive || isDone ? 1 : 0.5,
                  fontWeight: isActive ? 800 : isDone ? 700 : 500,
                  fontSize: 13,
                  color: isActive ? "var(--brand)" : isDone ? "var(--text)" : "var(--text-soft)",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isDone ? "var(--brand)" : isActive ? "var(--brand-light)" : "var(--bg-soft)",
                    color: isDone ? "#fff" : isActive ? "var(--brand)" : "var(--text-soft)",
                    border: isActive ? "2px solid var(--brand)" : "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {isDone ? <Check size={14} /> : s.num}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* STEP 4: ORDER CONFIRMATION SCREEN */}
      {step === 4 ? (
        <Card className="fc-fade-in" style={{ padding: "40px 32px", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--brand-light)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              border: "2.5px solid var(--brand)",
            }}
          >
            <Check size={40} />
          </div>

          <Badge variant="success" style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
            ✓ PAYMENT SUCCESSFUL
          </Badge>

          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 8px 0", color: "var(--text)" }}>
            Order Placed Successfully!
          </h2>
          <p className="fc-muted" style={{ fontSize: 14, margin: "0 0 24px 0", lineHeight: 1.5 }}>
            Your consolidated B2B procurement order has been broadcasted to regional growers.
          </p>

          <div
            style={{
              background: "var(--bg-soft)",
              padding: "18px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontSize: 13,
              textAlign: "left",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="fc-soft">Generated Order ID:</span>
              <strong style={{ fontSize: 15, color: "var(--brand)" }}>{completedOrder?.id || "FC-8492"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="fc-soft">Delivery Destination:</span>
              <strong>{form.address}, {form.city}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="fc-soft">Payment Status:</span>
              <strong style={{ color: "var(--brand)" }}>Paid / COD Confirmed</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="fc-soft">Total Procurement Value:</span>
              <strong style={{ fontSize: 15 }}>{formatCurrency(total)}</strong>
            </div>
          </div>

          <div className="fc-flex-gap-12" style={{ justifyContent: "center" }}>
            <Button variant="primary" onClick={() => navigate(`/customer/tracking/${completedOrder?.id || "FC-8492"}`)} style={{ fontWeight: 700 }}>
              Track Visual Delivery →
            </Button>
            <Button variant="outline" onClick={() => navigate("/customer/marketplace")}>
              Continue Procurement
            </Button>
          </div>
        </Card>
      ) : (
        /* STEPS 1-3 GRID LAYOUT */
        <div className="fc-cart-layout">
          <Card className="fc-panel" style={{ padding: "24px" }}>
            {/* STEP 1: DELIVERY ADDRESS */}
            {step === 1 && (
              <form onSubmit={handleProceedToReview} className="fc-fade-in">
                <h3 className="fc-h3 fc-mb-16">Step 1: Delivery Address & Contact</h3>

                <div className="fc-form-row">
                  <FormField label={t("fullName")} error={errors.fullName}>
                    <input
                      className={`fc-input ${errors.fullName ? "fc-input-error" : ""}`}
                      value={form.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      required
                    />
                  </FormField>

                  <FormField label={t("phone")} error={errors.phone}>
                    <input
                      className={`fc-input ${errors.phone ? "fc-input-error" : ""}`}
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="9876543210"
                      required
                    />
                  </FormField>
                </div>

                <div className="fc-field" style={{ marginBottom: 18 }}>
                  <label className="fc-label fc-label-required">Global Delivery Destination & Address</label>
                  <GlobalLocationSelector
                    value={deliveryLocation}
                    onChange={(newLoc) => setDeliveryLocation(newLoc)}
                    showAddressFields={true}
                  />
                </div>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" variant="primary" style={{ padding: "12px 24px", fontWeight: 700 }}>
                    Proceed to Order Review →
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: ORDER REVIEW */}
            {step === 2 && (
              <div className="fc-fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="fc-h3" style={{ margin: 0 }}>Step 2: Review Produce Order</h3>
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft size={14} /> Edit Address
                  </Button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  {lines.map((l) => (
                    <div
                      key={l.productId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        background: "var(--bg-soft)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14 }}>{l.product.name}</strong>
                        <div className="fc-soft" style={{ fontSize: 12, marginTop: 2 }}>
                          {l.qty} {l.product.unit} × {formatCurrency(l.activePrice)}/{l.product.unit}
                        </div>
                      </div>
                      <strong style={{ fontSize: 15, color: "var(--brand)" }}>{formatCurrency(l.amount)}</strong>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background: "var(--surface)",
                    padding: "14px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    marginBottom: 24,
                    fontSize: 13,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 4 }}>📍 Shipping Destination:</strong>
                  <span>{form.fullName} • {form.phone}</span>
                  <div className="fc-soft" style={{ marginTop: 2 }}>{form.address}, {form.city} - {form.pincode}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setStep(3)} style={{ padding: "12px 24px", fontWeight: 700 }}>
                    Proceed to Payment →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {step === 3 && (
              <div className="fc-fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="fc-h3" style={{ margin: 0 }}>Step 3: Select Payment Option</h3>
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft size={14} /> Back to Review
                  </Button>
                </div>

                <FormField label="Payment Method (Demo Mode)">
                  <div className="fc-radio-row" style={{ flexDirection: "column", gap: 10 }}>
                    {[
                      ["cod", "💵 Cash on Delivery (COD)", "Pay upon freight scale inspection at delivery."],
                      ["upi", "⚡ Instant UPI (GPay / PhonePe / Paytm)", "Direct zero-fee digital transfer."],
                      ["card", "💳 Credit / Debit Card", "Secure commercial corporate card payment."],
                    ].map(([val, label, desc]) => (
                      <label
                        key={val}
                        className={`fc-radio-chip ${form.payment === val ? "active" : ""}`}
                        style={{
                          cursor: "pointer",
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 4,
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
                          <input
                            type="radio"
                            name="payment"
                            checked={form.payment === val}
                            onChange={() => handleChange("payment", val)}
                          />
                          {label}
                        </div>
                        <span className="fc-soft" style={{ fontSize: 11.5, marginLeft: 24 }}>{desc}</span>
                      </label>
                    ))}
                  </div>
                </FormField>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                  <Button variant="outline" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleFinalCheckout}
                    disabled={submitting}
                    style={{ padding: "12px 28px", fontWeight: 700 }}
                  >
                    <CreditCard size={16} />{" "}
                    {submitting ? "Processing Payment..." : `Confirm & Pay ${formatCurrency(total)} →`}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Sticky Procurement Order Summary Sidebar */}
          <Card className="fc-order-summary" style={{ position: "sticky", top: 82, padding: "24px" }}>
            <h3 className="fc-h3 fc-mb-16">Procurement Summary</h3>
            {lines.map((l) => (
              <div
                className="fc-summary-row"
                key={l.productId}
                style={{
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 8,
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                <span>
                  {l.product.name} × {l.qty} {l.product.unit}
                </span>
                <strong>{formatCurrency(l.amount)}</strong>
              </div>
            ))}

            <div className="fc-summary-row" style={{ fontSize: 13, marginTop: 12 }}>
              <span>{t("deliveryFee")}</span>
              <strong>{formatCurrency(deliveryFee)}</strong>
            </div>

            <div
              className="fc-summary-row total"
              style={{ borderTop: "2.5px solid var(--border)", paddingTop: 10, marginTop: 10 }}
            >
              <span>{t("total")}</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

            <div className="fc-flex-gap-8 fc-mt-16 fc-soft" style={{ fontSize: 11 }}>
              <TruckIcon size={14} /> Direct B2B Logistics applied. Estimated delivery: 1-2 days.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export const Checkout = memo(CheckoutBase);
export default Checkout;

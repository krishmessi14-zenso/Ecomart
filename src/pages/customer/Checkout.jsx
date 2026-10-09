import { useState, useReducer, useMemo, useCallback, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { FormField } from "../../components/common/FormField.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Card } from "../../components/common/Card.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import {
  CreditCard,
  Truck as TruckIcon,
  Check,
  ArrowLeft,
  ShieldCheck,
  Loader
} from "../../components/icons/Icons.jsx";
import { formatCurrency, getActivePrice, calculateDeliveryFee } from "../../utils/formatters.js";
import { calculateDistanceKm } from "../../services/mapProvider.js";
import { useData } from "../../hooks/useData.js";
import { useCart } from "../../hooks/useCart.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import { GlobalLocationSelector } from "../../components/common/GlobalLocationSelector.jsx";

const initialCheckoutState = {
  form: {
    fullName: "",
    phone: "",
    address: "",
    payment: "razorpay", // 'razorpay' | 'cod'
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

// Dynamically load Razorpay Checkout SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function CheckoutBase() {
  const { t } = useLanguage();
  const { products, placeOrder } = useData();
  const { cart, clearCart } = useCart();
  const { user: currentUser, updateProfile } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  // Status message while creating or verifying Razorpay payment
  const [processingStatusText, setProcessingStatusText] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState(null);

  const [isChangingAddress, setIsChangingAddress] = useState(false);

  const [deliveryLocation, setDeliveryLocation] = useState(() => ({
    countryCode: currentUser?.countryCode || "IN",
    countryName: currentUser?.countryName || "India",
    region: currentUser?.region || currentUser?.state || "",
    district: currentUser?.district || "",
    city: currentUser?.city || "",
    address: currentUser?.address || currentUser?.formattedAddress || "",
    postalCode: currentUser?.postalCode || currentUser?.pincode || "",
    lat: currentUser?.lat || null,
    lng: currentUser?.lng || null,
    currency: currentUser?.currency || "INR"
  }));

  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  const { form, errors, submitting } = state;

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !form.fullName) {
        dispatch({ type: "SET_FIELD", field: "fullName", value: currentUser.name });
      }
      if (currentUser.phone && !form.phone) {
        dispatch({ type: "SET_FIELD", field: "phone", value: currentUser.phone });
      }
      if ((currentUser.address || currentUser.formattedAddress) && !form.address) {
        dispatch({ type: "SET_FIELD", field: "address", value: currentUser.address || currentUser.formattedAddress });
      }
      const timer = setTimeout(() => {
        setDeliveryLocation((prev) => ({
          countryCode: prev.countryCode || currentUser.countryCode || "IN",
          countryName: prev.countryName || currentUser.countryName || "India",
          region: prev.region || currentUser.region || currentUser.state || "",
          district: prev.district || currentUser.district || "",
          city: prev.city || currentUser.city || "",
          address: prev.address || currentUser.address || currentUser.formattedAddress || "",
          postalCode: prev.postalCode || currentUser.postalCode || currentUser.pincode || "",
          lat: prev.lat || currentUser.lat || null,
          lng: prev.lng || currentUser.lng || null,
          currency: prev.currency || currentUser.currency || "INR",
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentUser, form.address, form.fullName, form.phone]);

  const hasRegisteredAddress = Boolean(
    (deliveryLocation.address || form.address || currentUser?.address || currentUser?.formattedAddress || currentUser?.city || currentUser?.district || currentUser?.region) &&
    (deliveryLocation.region || deliveryLocation.city || currentUser?.region || currentUser?.city || currentUser?.state)
  );

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

  const primaryVendor = lines[0]?.product;
  const vendorStoreName = primaryVendor?.storeName || primaryVendor?.name || "EcoCraft Studio";

  const distanceKm = useMemo(() => {
    const vLat = primaryVendor?.lat;
    const vLng = primaryVendor?.lng;
    const dLat = deliveryLocation.lat;
    const dLng = deliveryLocation.lng;
    if (vLat && vLng && dLat && dLng) {
      return calculateDistanceKm(vLat, vLng, dLat, dLng);
    }
    return 0;
  }, [primaryVendor, deliveryLocation]);

  const deliveryFee = useMemo(() => {
    return calculateDeliveryFee({
      subtotal,
      distanceKm,
      vendorRegion: primaryVendor?.region,
      deliveryRegion: deliveryLocation.region,
      isFreeThreshold: 2000
    });
  }, [subtotal, distanceKm, primaryVendor, deliveryLocation.region]);

  const total = subtotal + deliveryFee;

  const handleChange = useCallback((field, value) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const handleProceedToReview = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!form.fullName?.trim()) {
      newErrors.fullName = "Full Name is required.";
    }
    if (!form.phone?.trim()) {
      newErrors.phone = "Phone number is required.";
    }
    if (!deliveryLocation.region) {
      newErrors.region = "Please select State / Region.";
    }
    if (!deliveryLocation.city?.trim()) {
      newErrors.city = "City / Place is required.";
    }
    if (!deliveryLocation.address?.trim() && !form.address?.trim()) {
      newErrors.address = "Street / Building Address is required.";
    }
    if (!deliveryLocation.postalCode?.trim()) {
      newErrors.postalCode = "Postal / ZIP Code is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      dispatch({ type: "SET_ERRORS", errors: newErrors });
      notifyError("Please fill out all required delivery address and contact fields.");
      return;
    }

    // Auto-save address to user profile so customer never has to enter it again
    if (currentUser?.id && updateProfile) {
      try {
        await updateProfile(currentUser.id, {
          name: form.fullName.trim(),
          phone: form.phone ? form.phone.trim() : null,
          address: (deliveryLocation.address || form.address || "").trim(),
          formattedAddress: (deliveryLocation.address || form.address || "").trim(),
          city: (deliveryLocation.city || "").trim(),
          district: (deliveryLocation.district || "").trim(),
          region: (deliveryLocation.region || "").trim(),
          countryName: (deliveryLocation.countryName || "India").trim(),
          countryCode: (deliveryLocation.countryCode || "IN").trim(),
          postalCode: (deliveryLocation.postalCode || "").trim(),
          lat: deliveryLocation.lat || null,
          lng: deliveryLocation.lng || null,
          currency: deliveryLocation.currency || "INR"
        });
      } catch (err) {
        console.warn("Background profile address update:", err);
      }
    }

    setStep(2);
  };

  /**
   * Handle Razorpay & COD Payment Initiation
   */
  const handleInitiatePayment = async (e) => {
    e.preventDefault();
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

    const orderPayload = {
      customerId: currentUser?.id || null,
      customerName: form.fullName || currentUser?.name || "Customer",
      deliveryCountry: deliveryLocation.countryName || "India",
      deliveryRegion: deliveryLocation.region || "",
      deliveryDistrict: deliveryLocation.district || "",
      deliveryCity: deliveryLocation.city || "",
      deliveryPostalCode: deliveryLocation.postalCode || "",
      deliveryAddress: formattedDeliveryAddress,
      paymentMethod: form.payment === "cod" ? "Cash on Delivery (COD)" : "Razorpay Secure Payment",
      totalAmount: total,
      deliveryFee: deliveryFee,
      currency: deliveryLocation.currency || "INR",
      items: lines.map((l) => ({
        productId: l.product.id,
        vendorId: l.product.vendorId,
        qty: l.qty,
        unitPrice: l.activePrice,
        amount: l.amount,
      })),
    };

    // Flow for Cash on Delivery
    if (form.payment === "cod") {
      try {
        setProcessingStatusText("Placing COD order...");
        const created = await placeOrder(orderPayload);
        const createdObj = Array.isArray(created) ? created[0] : created;
        const generatedOrderId = createdObj?.id || `EM-${Math.floor(Math.random() * 9000 + 1000)}`;

        const receipt = {
          orderId: generatedOrderId,
          paymentId: "COD-PENDING",
          paymentMethod: "Cash on Delivery (COD)",
          paymentStatus: "pending",
          amount: total,
          currency: deliveryLocation.currency || "INR",
          vendorStore: vendorStoreName,
          customerName: form.fullName || currentUser?.name || "Customer",
          customerPhone: form.phone,
          address: formattedDeliveryAddress,
          timestamp: new Date().toLocaleString()
        };

        notifySuccess(`COD Order ${generatedOrderId} placed successfully!`);
        clearCart();
        setCompletedOrder(createdObj || { id: generatedOrderId });
        setPaymentReceipt(receipt);
        setStep(4);
      } catch (err) {
        console.error("COD checkout error:", err);
        notifyError(err.message || "Failed to place COD order.");
      } finally {
        dispatch({ type: "SUBMIT_COMPLETE" });
        setProcessingStatusText("");
      }
      return;
    }

    // Flow for Real Razorpay Checkout Standard
    try {
      setProcessingStatusText("Creating pending order...");

      // 1. Create EcoMart pending order on backend
      let ecoMartOrder = null;

      if (pendingOrderId) {
        ecoMartOrder = { id: pendingOrderId, totalAmount: total };
      } else {
        const created = await placeOrder(orderPayload);
        const createdObj = Array.isArray(created) ? created[0] : created;
        ecoMartOrder = createdObj || { id: `EM-${Math.floor(Math.random() * 9000 + 1000)}` };
        setPendingOrderId(ecoMartOrder.id);
      }

      setProcessingStatusText("Initializing Razorpay Secure Gateway...");

      // 2. Request backend to create a real Razorpay order using official SDK
      const razorpayOrderRes = await fetch("/api/payments/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: ecoMartOrder.id }),
      });

      const rzpData = await razorpayOrderRes.json();

      if (!razorpayOrderRes.ok) {
        throw new Error(rzpData.error || "Failed to initialize Razorpay payment order.");
      }

      // 3. Load official Razorpay Checkout SDK script
      setProcessingStatusText("Opening Razorpay Checkout...");
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Failed to load Razorpay payment SDK script. Please check your network connection.");
      }

      // 4. Open real Razorpay Checkout Standard modal
      const options = {
        key: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency || "INR",
        name: "EcoMart",
        description: `EcoMart Order ${ecoMartOrder.id}`,
        ...(rzpData.razorpayOrderId ? { order_id: rzpData.razorpayOrderId } : {}),
        prefill: {
          name: form.fullName || currentUser?.name || "",
          contact: form.phone || "",
          email: currentUser?.email || ""
        },
        theme: {
          color: "#047857"
        },
        handler: async function (response) {
          setProcessingStatusText("Verifying payment signature...");
          try {
            // Send real payment verification values to backend
            const verifyRes = await fetch("/api/payments/verify-razorpay-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: ecoMartOrder.id
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment signature verification failed.");
            }

            const receipt = {
              orderId: ecoMartOrder.id,
              paymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              paymentMethod: "Razorpay Checkout (Cards, UPI, Banking, Wallets)",
              paymentStatus: "paid",
              amount: total,
              currency: deliveryLocation.currency || "INR",
              vendorStore: vendorStoreName,
              customerName: form.fullName || currentUser?.name || "Customer",
              customerPhone: form.phone,
              address: formattedDeliveryAddress,
              timestamp: new Date().toLocaleString()
            };

            notifySuccess(`Payment Successful! Razorpay Payment ID: ${response.razorpay_payment_id}`);
            clearCart();
            setCompletedOrder(ecoMartOrder);
            setPaymentReceipt(receipt);
            setStep(4);
          } catch (err) {
            console.error("Razorpay verification error:", err);
            notifyError(err.message || "Failed to verify Razorpay payment.");
          } finally {
            dispatch({ type: "SUBMIT_COMPLETE" });
            setProcessingStatusText("");
          }
        },
        modal: {
          ondismiss: async function () {
            notifyError("Payment process was cancelled or closed.");
            dispatch({ type: "SUBMIT_COMPLETE" });
            setProcessingStatusText("");

            try {
              await fetch("/api/payments/cancel-razorpay-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: ecoMartOrder.id, reason: "Razorpay modal dismissed" })
              });
            } catch {
              /* ignore */
            }
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", async function (failureResponse) {
        console.error("Razorpay Payment Failed:", failureResponse.error);
        notifyError(`Payment failed: ${failureResponse.error?.description || "Transaction declined."}`);
        dispatch({ type: "SUBMIT_COMPLETE" });
        setProcessingStatusText("");

        try {
          await fetch("/api/payments/cancel-razorpay-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: ecoMartOrder.id, reason: failureResponse.error?.description || "Payment failed" })
          });
        } catch {
          /* ignore */
        }
      });

      razorpayInstance.open();

    } catch (err) {
      console.error("Razorpay Checkout Error:", err);
      notifyError(err.message || "Failed to initiate Razorpay payment checkout.");
      dispatch({ type: "SUBMIT_COMPLETE" });
      setProcessingStatusText("");
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

      {/* STEP 4: ORDER CONFIRMATION & PAYMENT RECEIPT */}
      {step === 4 ? (
        <Card className="fc-fade-in" style={{ padding: "40px 32px", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
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

          <Badge variant="success" style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, padding: "6px 14px" }}>
            ✓ {paymentReceipt?.paymentStatus === "paid" ? "PAYMENT VERIFIED & CONFIRMED" : "ORDER PLACED (COD PENDING)"}
          </Badge>

          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 8px 0", color: "var(--text)" }}>
            {paymentReceipt?.paymentStatus === "paid" ? "Payment Successful & Order Confirmed!" : "Order Placed Successfully!"}
          </h2>
          <p className="fc-muted" style={{ fontSize: 14, margin: "0 0 24px 0", lineHeight: 1.5 }}>
            Thank you for shopping with EcoMart. Your order total of <strong>{formatCurrency(paymentReceipt?.amount || total)}</strong> has been processed securely.
          </p>

          <div
            style={{
              background: "var(--bg-soft)",
              padding: "20px 24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontSize: 13,
              textAlign: "left",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
              <span className="fc-soft">EcoMart Order ID:</span>
              <strong style={{ fontSize: 15, color: "var(--brand)" }}>{completedOrder?.id || paymentReceipt?.orderId}</strong>
            </div>

            {paymentReceipt?.paymentId && paymentReceipt.paymentId !== "COD-PENDING" && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span className="fc-soft">Razorpay Payment ID:</span>
                <strong style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text)" }}>{paymentReceipt.paymentId}</strong>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="fc-soft">Payment Status:</span>
              <strong style={{ textTransform: "capitalize", color: paymentReceipt?.paymentStatus === "paid" ? "#047857" : "#d97706" }}>
                {paymentReceipt?.paymentStatus || "paid"}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="fc-soft">Payment Method:</span>
              <strong>{paymentReceipt?.paymentMethod || form.payment}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="fc-soft">Vendor Store:</span>
              <strong>{paymentReceipt?.vendorStore || vendorStoreName}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="fc-soft">Delivery Destination:</span>
              <strong style={{ textAlign: "right", maxWidth: 300 }}>{paymentReceipt?.address}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1.5px dashed var(--border)" }}>
              <span className="fc-soft" style={{ fontSize: 14, fontWeight: 700 }}>Total Value Paid:</span>
              <strong style={{ fontSize: 17, color: "var(--brand)" }}>{formatCurrency(paymentReceipt?.amount || total)}</strong>
            </div>
          </div>

          <div className="fc-flex-gap-12" style={{ justifyContent: "center" }}>
            <Button variant="primary" onClick={() => navigate(`/customer/tracking/${completedOrder?.id || "EM-9210"}`)} style={{ fontWeight: 700 }}>
              Track Live Order Delivery →
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="fc-h3" style={{ margin: 0 }}>Step 1: Delivery Address & Contact</h3>
                  {hasRegisteredAddress && isChangingAddress && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingAddress(false)}
                      style={{ fontWeight: 700 }}
                    >
                      ← Use Registered Address
                    </Button>
                  )}
                </div>

                {hasRegisteredAddress && !isChangingAddress ? (
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.06)",
                      border: "1.5px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "var(--radius-md)",
                      padding: "20px 24px",
                      marginBottom: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge variant="success" style={{ fontWeight: 800, padding: "4px 10px" }}>
                          ✓ Saved Registered Address
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangingAddress(true)}
                        style={{ fontWeight: 700, borderRadius: 10 }}
                      >
                        ✏️ Change Address
                      </Button>
                    </div>

                    <div style={{ fontSize: 14.5, color: "var(--text)", lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                        {form.fullName} {form.phone ? `• ${form.phone}` : ""}
                      </div>
                      <div className="fc-soft">
                        {[
                          deliveryLocation.address || form.address,
                          deliveryLocation.city,
                          deliveryLocation.district,
                          deliveryLocation.region,
                          deliveryLocation.countryName || "India",
                          deliveryLocation.postalCode
                        ].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="fc-form-row">
                      <FormField label={t("fullName")} error={errors.fullName}>
                        <input
                          className={`fc-input ${errors.fullName ? "fc-input-error" : ""}`}
                          value={form.fullName}
                          onChange={(e) => handleChange("fullName", e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </FormField>

                      <FormField label={t("phone")} error={errors.phone}>
                        <input
                          className={`fc-input ${errors.phone ? "fc-input-error" : ""}`}
                          value={form.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          placeholder="e.g. 9876543210"
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
                  </>
                )}

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
                  <div className="fc-soft" style={{ marginTop: 2 }}>
                    {deliveryLocation.address || form.address}, {deliveryLocation.city}, {deliveryLocation.region} ({deliveryLocation.postalCode})
                  </div>
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
                  <h3 className="fc-h3" style={{ margin: 0 }}>Step 3: Payment Option</h3>
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft size={14} /> Back to Review
                  </Button>
                </div>

                <FormField label="Select Payment Method">
                  <div className="fc-radio-row" style={{ flexDirection: "column", gap: 12 }}>
                    {[
                      ["razorpay", "⚡ Razorpay Secure Payment (UPI, Cards, Net Banking, Wallets)", "Pay securely using official Razorpay Checkout modal supporting UPI Apps, Cards, Net Banking & Wallets."],
                      ["cod", "💵 Cash on Delivery (COD)", "Pay in cash or UPI upon physical inspection at delivery."],
                    ].map(([val, label, desc]) => (
                      <label
                        key={val}
                        className={`fc-radio-chip ${form.payment === val ? "active" : ""}`}
                        style={{
                          cursor: "pointer",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 6,
                          borderRadius: "var(--radius-md)",
                          border: form.payment === val ? "2px solid var(--brand)" : "1px solid var(--border)",
                          background: form.payment === val ? "var(--brand-light)" : "var(--bg-soft)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 14.5 }}>
                          <input
                            type="radio"
                            name="payment"
                            checked={form.payment === val}
                            onChange={() => handleChange("payment", val)}
                          />
                          {label}
                        </div>
                        <span className="fc-soft" style={{ fontSize: 12, marginLeft: 26, lineHeight: 1.4 }}>{desc}</span>
                      </label>
                    ))}
                  </div>
                </FormField>

                {form.payment === "razorpay" && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "14px 16px",
                      background: "rgba(4, 120, 87, 0.06)",
                      border: "1px solid rgba(4, 120, 87, 0.2)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12.5,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    }}
                  >
                    <ShieldCheck size={24} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    <div>
                      <strong>Razorpay Checkout Standard:</strong> All actual payment credentials (UPI PIN, Card number, Net Banking login) are handled directly by Razorpay on secure bank channels.
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                  <Button variant="outline" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleInitiatePayment}
                    disabled={submitting}
                    style={{ padding: "12px 28px", fontWeight: 800, fontSize: 15 }}
                  >
                    <CreditCard size={18} />{" "}
                    {submitting ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Loader size={16} /> {processingStatusText || "Processing Payment..."}
                      </span>
                    ) : (
                      form.payment === "cod" ? "Place COD Order →" : `Pay ${formatCurrency(total)} Securely →`
                    )}
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

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  CNY: "¥",
  JPY: "¥",
  BRL: "R$",
  ZAF: "R"
};

export function formatCurrency(amount, currencyCode = "INR") {
  const num = Number(amount || 0);
  const code = (currencyCode || "INR").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;

  if (code === "INR") {
    return `${symbol}${num.toLocaleString("en-IN")}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(num);
  } catch {
    return `${symbol}${num.toFixed(2)}`;
  }
}

export function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function initials(name) {
  return String(name || "").trim().slice(0, 1).toUpperCase();
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

export function getActivePrice(product, qty = 1) {
  if (!product) return 0;
  let tiers = {};
  if (typeof product.tierPrices === "object" && product.tierPrices !== null) {
    tiers = product.tierPrices;
  } else if (typeof product.tierPrices === "string") {
    try {
      tiers = JSON.parse(product.tierPrices);
    } catch {
      tiers = {};
    }
  }
  
  let activePrice = Number(product.price || 0);
  if (!tiers || typeof tiers !== "object") return activePrice;

  const sortedTiers = Object.entries(tiers)
    .map(([threshold, price]) => ({ threshold: Number(threshold), price: Number(price) }))
    .filter((t) => !isNaN(t.threshold) && !isNaN(t.price))
    .sort((a, b) => b.threshold - a.threshold);
    
  for (const tier of sortedTiers) {
    if (qty >= tier.threshold) {
      activePrice = tier.price;
      break;
    }
  }
  return activePrice;
}

/**
 * Dynamic Flexible Distance-Based Delivery Fee Calculator
 */
export function calculateDeliveryFee({ subtotal = 0, distanceKm = 0, vendorRegion = "", deliveryRegion = "", isFreeThreshold = 2000 }) {
  if (subtotal <= 0) return 0;

  // Free shipping for large orders (>= ₹2,000)
  if (subtotal >= isFreeThreshold) return 0;

  // 1. If distance in km is calculated:
  if (distanceKm > 0) {
    if (distanceKm <= 15) {
      // Local city delivery: ₹40 base + ₹2.5/km (max ₹100)
      return Math.min(100, Math.max(40, Math.round(40 + distanceKm * 2.5)));
    } else if (distanceKm <= 100) {
      // Regional district delivery: ₹60 base + ₹2/km (max ₹200)
      return Math.min(200, Math.max(60, Math.round(60 + distanceKm * 2.0)));
    } else if (distanceKm <= 400) {
      // Inter-district delivery: ₹100 base + ₹1.2/km (max ₹300)
      return Math.min(300, Math.max(100, Math.round(100 + distanceKm * 1.2)));
    } else {
      // Long distance / Inter-state delivery: ₹150 base + ₹0.8/km (max ₹400)
      return Math.min(400, Math.max(150, Math.round(150 + distanceKm * 0.8)));
    }
  }

  // 2. Region-based calculation if lat/lng not provided:
  if (vendorRegion && deliveryRegion) {
    const isSameRegion = vendorRegion.toLowerCase().trim() === deliveryRegion.toLowerCase().trim();
    if (isSameRegion) {
      return 50; // Local state delivery rate
    } else {
      return 120; // Inter-state delivery rate
    }
  }

  // Standard flexible tier based on order subtotal
  if (subtotal < 300) return 40;
  if (subtotal < 800) return 60;
  if (subtotal < 1500) return 90;
  return 120;
}

/* ========================================================================
   EcoMart Centralized Constants — Sustainable Products Marketplace
   ======================================================================== */

export const CATEGORIES = [
  "Reusable & Household",
  "Personal Care & Hygiene",
  "Organic Food & Beverage",
  "Recycled Stationery",
  "Solar & Green Tech",
  "Biodegradable Packaging",
  "Sustainable Apparel",
];
export const REGIONS = ["Maharashtra", "Punjab", "Haryana", "Tamil Nadu", "Kerala", "Gujarat", "Andhra Pradesh"];
export const UNITS = ["piece", "pack", "kg", "liter", "box"];
export const GRADES = ["A", "B", "C"];

// Sustainability attributes used to compute a product's Eco Score
export const MATERIAL_TYPES = [
  { value: "bamboo", label: "Bamboo", points: 30 },
  { value: "organic", label: "Organic Cotton", points: 28 },
  { value: "recycled", label: "Recycled Material", points: 28 },
  { value: "steel", label: "Stainless Steel", points: 26 },
  { value: "glass", label: "Glass", points: 24 },
  { value: "biodegradable", label: "Biodegradable Polymer", points: 25 },
  { value: "standard", label: "Standard / Mixed Material", points: 12 },
];

export const PACKAGING_TYPES = [
  { value: "plastic_free", label: "100% Plastic-Free", points: 20 },
  { value: "compostable", label: "Compostable Mailer", points: 20 },
  { value: "recycled_paper", label: "Recycled Kraft Paper", points: 16 },
  { value: "minimal_plastic", label: "Minimal Plastic", points: 8 },
];

// Compute a 0-100 Eco Score from a product's sustainability attributes
export function calculateEcoScore({ materialType, packagingType, recyclability = 80, isRenewableEnergy = false, lifespanYears = 2 }) {
  const materialPts = MATERIAL_TYPES.find((m) => m.value === materialType)?.points ?? 15;
  const packagingPts = PACKAGING_TYPES.find((p) => p.value === packagingType)?.points ?? 10;
  const recyclabilityPts = Math.min(20, (Number(recyclability) / 100) * 20);
  const energyPts = isRenewableEnergy ? 20 : 10;
  const lifespanPts = Math.min(10, Number(lifespanYears) * 2.5);
  return Math.round(materialPts + packagingPts + recyclabilityPts + energyPts + lifespanPts);
}

// Estimate the environmental impact (per unit) for a given Eco Score
export function estimateImpactMetrics(ecoScore) {
  const factor = ecoScore / 100;
  return {
    co2SavedKg: parseFloat((factor * 3.5).toFixed(2)),
    plasticSavedKg: parseFloat((factor * 0.45).toFixed(2)),
    waterSavedLiters: Math.round(factor * 120),
    treesEquivalent: parseFloat((factor * 0.15).toFixed(2)),
  };
}

// Order lifecycle statuses
export const ORDER_STATUSES = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

// Map backend status values to CSS class suffix
export const STATUS_CLASS_MAP = {
  Pending: "pending",
  Confirmed: "confirmed",
  Accepted: "accepted",
  Preparing: "preparing",
  Dispatched: "dispatched",
  "In Transit": "in-transit",
  "Out for Delivery": "dispatched",
  "Ready for Pickup": "preparing",
  "Picked Up": "dispatched",
  Delivered: "delivered",
  Cancelled: "cancelled",
  Rejected: "rejected",
};

// Verification statuses
export const VERIFICATION_STATUSES = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

// Product approval statuses (admin review before a product appears in the marketplace)
export const APPROVAL_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// Product grade colors
export const GRADE_COLORS = {
  A: "#166534",
  B: "#b45309",
  C: "#6b7280",
};

// Payment methods
export const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "upi", label: "UPI Payment" },
  { value: "card", label: "Credit / Debit Card" },
];

// Category image mapping for product cards (Unsplash sustainable-product imagery)
export const CATEGORY_IMAGES = {
  "Reusable & Household": "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600",
  "Personal Care & Hygiene": "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600",
  "Organic Food & Beverage": "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600",
  "Recycled Stationery": "https://images.unsplash.com/photo-1519669556878-63bdad8a1a49?w=600",
  "Solar & Green Tech": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600",
  "Biodegradable Packaging": "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?w=600",
  "Sustainable Apparel": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600",
};

// Get image for a product based on category (falls back to a neutral eco placeholder)
export function getProductImage(product) {
  const fallback = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600";
  if (!product) return fallback;
  if (product.imageUrl && product.imageUrl.trim()) return product.imageUrl;
  return CATEGORY_IMAGES[product.category] || fallback;
}

// Get status badge CSS class
export function getStatusClass(status) {
  return STATUS_CLASS_MAP[status] || "pending";
}

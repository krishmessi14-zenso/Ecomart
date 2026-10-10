import { useState, useCallback, memo, useEffect, useMemo } from "react";
import { FormField } from "../common/FormField.jsx";
import { Button } from "../common/Button.jsx";
import { CATEGORIES, GRADES, UNITS, MATERIAL_TYPES, PACKAGING_TYPES, calculateEcoScore } from "../../utils/constants.js";
import { validateProductForm } from "../../utils/validators.js";
import { useLanguage } from "../../hooks/useLanguage.js";



const EMPTY = {
  name: "",
  category: CATEGORIES[0],
  grade: "A",
  price: "",
  unit: UNITS[0],
  stock: "",
  description: "",
  imageUrl: "",
  images: "[]",
  moq: 1,
  tierPrices: "{}",
  organic: 0,
  harvestDate: "",
  materialType: "standard",
  packagingType: "minimal_plastic",
  recyclability: 80,
  isRenewableEnergy: 0,
  lifespanYears: 2
};

function ProductFormBase({ initialValue, onSubmit, onCancel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(() => {
    if (initialValue) {
      return {
        ...EMPTY,
        ...initialValue,
        moq: initialValue.moq ?? 1,
        tierPrices: initialValue.tierPrices ?? "{}",
        organic: initialValue.organic ?? 0,
        harvestDate: initialValue.harvestDate ? initialValue.harvestDate.split("T")[0] : "",
        imageUrl: initialValue.imageUrl ?? "",
        images: initialValue.images ?? "[]",
        materialType: initialValue.materialType ?? "standard",
        packagingType: initialValue.packagingType ?? "minimal_plastic",
        recyclability: initialValue.recyclability ?? 80,
        isRenewableEnergy: initialValue.isRenewableEnergy ?? 0,
        lifespanYears: initialValue.lifespanYears ?? 2
      };
    }
    return {
      ...EMPTY,
      harvestDate: new Date().toISOString().split("T")[0]
    };
  });

  // Helper to safely extract string URL from string or object
  const getImgUrl = useCallback((item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    if (typeof item === "object") {
      return item.imageUrl || item.url || item.src || "";
    }
    return "";
  }, []);

  // 5 Images state array
  const [imagesList, setImagesList] = useState(() => {
    let initialList = ["", "", "", "", ""];
    if (initialValue) {
      try {
        const parsed = typeof initialValue.images === "string" ? JSON.parse(initialValue.images) : initialValue.images;
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (let i = 0; i < 5; i++) {
            initialList[i] = getImgUrl(parsed[i]);
          }
        }
      } catch {
        if (initialValue.imageUrl) initialList[0] = initialValue.imageUrl;
      }
      if (!initialList[0] && initialValue.imageUrl) {
        initialList[0] = initialValue.imageUrl;
      }
    }
    return initialList;
  });

  const [errors, setErrors] = useState({});

  // Sync imagesList back into form state
  useEffect(() => {
    const active = imagesList.map((img) => getImgUrl(img)).filter((url) => url && typeof url === "string" && url.trim());
    const timer = setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        images: JSON.stringify(imagesList),
        imageUrl: active[0] || prev.imageUrl || ""
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [imagesList, getImgUrl]);

  // Parse tiers for interactive editing
  const [tiers, setTiers] = useState(() => {
    try {
      const raw = initialValue?.tierPrices;
      if (!raw) return [];
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== "object") return [];
      return Object.entries(parsed).map(([qty, pr]) => ({ qty: Number(qty), price: Number(pr) }));
    } catch {
      return [];
    }
  });

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    const obj = {};
    tiers.forEach((t) => {
      if (t.qty > 0 && t.price > 0) {
        obj[t.qty] = t.price;
      }
    });
    handleChange("tierPrices", JSON.stringify(obj));
  }, [tiers, handleChange]);

  const handleAddTier = useCallback(() => {
    setTiers((prev) => [...prev, { qty: "", price: "" }]);
  }, []);

  const handleRemoveTier = useCallback((index) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTierChange = useCallback((index, field, value) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: Number(value) || value } : t)));
  }, []);

  // Image Upload Handlers via Multer API
  const handleFileUpload = useCallback(async (index, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload/product", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setImagesList((prev) => {
            const next = [...prev];
            next[index] = data.imageUrl;
            return next;
          });
          return;
        }
      }
    } catch (err) {
      console.warn("Multer upload notice, using local file reader:", err);
    }

    // Local fallback
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setImagesList((prev) => {
        const next = [...prev];
        next[index] = dataUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback((index) => {
    setImagesList((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
  }, []);





  const ecoScorePreview = useMemo(
    () =>
      calculateEcoScore({
        materialType: form.materialType,
        packagingType: form.packagingType,
        recyclability: form.recyclability,
        isRenewableEnergy: !!form.isRenewableEnergy,
        lifespanYears: form.lifespanYears
      }),
    [form.materialType, form.packagingType, form.recyclability, form.isRenewableEnergy, form.lifespanYears]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const validation = validateProductForm(form, t);
      setErrors(validation);
      if (Object.keys(validation).length === 0) {
        const active = imagesList.map((img) => getImgUrl(img)).filter((url) => url && typeof url === "string" && url.trim());
        onSubmit({
          ...form,
          images: JSON.stringify(imagesList),
          imageUrl: active[0] || form.imageUrl || "",
          price: Number(form.price),
          stock: Number(form.stock),
          moq: Number(form.moq),
          organic: Number(form.organic),
          recyclability: Number(form.recyclability),
          isRenewableEnergy: form.isRenewableEnergy ? 1 : 0,
          lifespanYears: Number(form.lifespanYears)
        });
      }
    },
    [form, imagesList, getImgUrl, onSubmit, t]
  );

  return (
    <form onSubmit={handleSubmit} className="fc-product-form">
      <FormField label={t("productName")} error={errors.name}>
        <input
          className={`fc-input ${errors.name ? "fc-input-error" : ""}`}
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. Bamboo Fiber Lunch Box"
          required
        />
      </FormField>

      <div className="fc-form-row">
        <FormField label={t("categoryLabel")} error={errors.category}>
          <select className="fc-select" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("gradeLabel")} error={errors.grade}>
          <select className="fc-select" value={form.grade} onChange={(e) => handleChange("grade", e.target.value)}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Quality Grade {g}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="fc-form-row">
        <FormField label={t("priceLabel")} error={errors.price}>
          <input
            type="number"
            min="1"
            className={`fc-input ${errors.price ? "fc-input-error" : ""}`}
            value={form.price}
            onChange={(e) => handleChange("price", e.target.value)}
            placeholder="599"
            required
          />
        </FormField>
        <FormField label={t("unitLabel")} error={errors.unit}>
          <select className="fc-select" value={form.unit} onChange={(e) => handleChange("unit", e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="fc-form-row">
        <FormField label={t("stockLabel")} error={errors.stock}>
          <input
            type="number"
            min="1"
            className={`fc-input ${errors.stock ? "fc-input-error" : ""}`}
            value={form.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            placeholder="50"
            required
          />
        </FormField>
        <FormField label={t("moq") || "Min Order Quantity"}>
          <input
            type="number"
            min="1"
            className="fc-input"
            value={form.moq}
            onChange={(e) => handleChange("moq", e.target.value)}
            placeholder="1"
            required
          />
        </FormField>
      </div>

      <div className="fc-form-row">
        <FormField label={t("harvestDate", "Manufactured Date")}>
          <input
            type="date"
            className="fc-input"
            value={form.harvestDate}
            onChange={(e) => handleChange("harvestDate", e.target.value)}
          />
        </FormField>
      </div>

      {/* --- 📸 5-Image Uploader --- */}
      <div className="fc-panel" style={{ border: "1.5px solid var(--border)", padding: "16px", marginBottom: "20px", borderRadius: "8px", background: "var(--surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <strong style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              🖼️ Product Image Gallery (Up to 5 Photos)
            </strong>
            <span className="fc-soft" style={{ fontSize: "11px", display: "block" }}>
              Upload up to 5 photos of your product.
            </span>
          </div>
        </div>

        {/* 5 Image Grid Slots */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
          {[0, 1, 2, 3, 4].map((idx) => {
            const img = imagesList[idx];

            return (
              <div
                key={idx}
                style={{
                  border: "1.5px dashed var(--border)",
                  borderRadius: "8px",
                  padding: "8px",
                  background: img ? "var(--bg-soft)" : "var(--surface)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: "145px"
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    left: "6px",
                    background: idx === 0 ? "#059669" : "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    zIndex: 2
                  }}
                >
                  {idx === 0 ? "★ COVER" : `PHOTO ${idx + 1}`}
                </span>

                {img ? (
                  <div style={{ width: "100%", textAlign: "center", marginTop: "16px" }}>
                    <img
                      src={getImgUrl(img)}
                      alt={`Product slot ${idx + 1}`}
                      style={{ width: "100%", height: "85px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border)" }}
                    />
                    <div style={{ display: "flex", gap: "4px", marginTop: "8px", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{
                          fontSize: "10px",
                          padding: "3px 6px",
                          background: "#fef2f2",
                          color: "#b91c1c",
                          border: "1px solid #fecaca",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      cursor: "pointer",
                      paddingTop: "20px",
                      textAlign: "center"
                    }}
                  >
                    <span style={{ fontSize: "20px", opacity: 0.7 }}>📷</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand)", marginTop: "4px" }}>
                      + Add Photo
                    </span>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Upload file</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(idx, e)}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fc-mb-16">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!form.organic}
            onChange={(e) => handleChange("organic", e.target.checked ? 1 : 0)}
            style={{ width: 16, height: 16 }}
          />
          🌿 {t("verifiedOrganic") || "Certified Organic / Sustainably Sourced"}
        </label>
      </div>

      {/* Eco Score Engine */}
      <div className="fc-panel" style={{ border: "1px solid var(--border)", padding: 12, marginBottom: 16, background: "var(--brand-light)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ fontSize: 13 }}>🌍 Sustainability & Eco Score</strong>
          <span style={{ fontSize: 20, fontWeight: 900, color: "var(--brand-dark)" }}>{ecoScorePreview}/100</span>
        </div>
        <p className="fc-soft" style={{ fontSize: 11, marginBottom: 10 }}>
          This live score is calculated from the attributes below and shown to customers on every product page. Editing these fields will send the listing back for Admin review.
        </p>

        <div className="fc-form-row">
          <FormField label="Primary Material">
            <select className="fc-select" value={form.materialType} onChange={(e) => handleChange("materialType", e.target.value)}>
              {MATERIAL_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.points} pts)
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Packaging Type">
            <select className="fc-select" value={form.packagingType} onChange={(e) => handleChange("packagingType", e.target.value)}>
              {PACKAGING_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.points} pts)
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="fc-form-row">
          <FormField label="Recyclability (%)">
            <input
              type="number"
              min="0"
              max="100"
              className="fc-input"
              value={form.recyclability}
              onChange={(e) => handleChange("recyclability", e.target.value)}
            />
          </FormField>
          <FormField label="Product Lifespan (years)">
            <input
              type="number"
              min="0"
              step="0.5"
              className="fc-input"
              value={form.lifespanYears}
              onChange={(e) => handleChange("lifespanYears", e.target.value)}
            />
          </FormField>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: "bold", cursor: "pointer", marginTop: 4 }}>
          <input
            type="checkbox"
            checked={!!form.isRenewableEnergy}
            onChange={(e) => handleChange("isRenewableEnergy", e.target.checked ? 1 : 0)}
            style={{ width: 16, height: 16 }}
          />
          ☀️ Manufactured using renewable / solar energy
        </label>
      </div>

      {/* Wholesale Pricing Tiers Builder */}
      <div className="fc-panel" style={{ border: "1px solid var(--border)", padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>📈 {t("wholesaleTiers") || "Bulk Pricing Tiers"}</strong>
          <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
            + {t("addTier") || "Add Tier"}
          </Button>
        </div>

        {tiers.length === 0 ? (
          <p className="fc-soft" style={{ fontSize: 11, fontStyle: "italic" }}>
            {t("noTiers") || "No bulk discounts added. Sell at base price for all order sizes."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tiers.map((tier, index) => (
              <div key={index} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, width: 60 }}>≥</span>
                <input
                  type="number"
                  min="1"
                  className="fc-input"
                  style={{ width: 80 }}
                  value={tier.qty}
                  onChange={(e) => handleTierChange(index, "qty", e.target.value)}
                  placeholder="10"
                  required
                />
                <span style={{ fontSize: 12 }}>{form.unit}, ₹</span>
                <input
                  type="number"
                  min="1"
                  className="fc-input"
                  style={{ width: 80 }}
                  value={tier.price}
                  onChange={(e) => handleTierChange(index, "price", e.target.value)}
                  placeholder="39"
                  required
                />
                <span style={{ fontSize: 12 }}>/{form.unit}</span>
                <button
                  type="button"
                  className="fc-link-btn"
                  style={{ color: "var(--danger)" }}
                  onClick={() => handleRemoveTier(index)}
                >
                  {t("common.delete") || "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormField label={t("descriptionLabel")} error={errors.description}>
        <textarea
          className={`fc-textarea ${errors.description ? "fc-textarea-error" : ""}`}
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Describe the materials, sustainability benefits, and use-case..."
          rows={3}
        />
      </FormField>

      <div className="fc-flex" style={{ justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="primary">
          {initialValue ? "Save Changes & Resubmit" : "Submit for Admin Approval"}
        </Button>
      </div>
    </form>
  );
}

export const ProductForm = memo(ProductFormBase);
export default ProductForm;

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

  const [errors, setErrors] = useState({});

  // Parse tiers for interactive editing (bulk/wholesale pricing)
  const [tiers, setTiers] = useState(() => {
    try {
      const parsed = JSON.parse(initialValue?.tierPrices || "{}");
      return Object.entries(parsed).map(([qty, pr]) => ({ qty: Number(qty), price: Number(pr) }));
    } catch {
      return [];
    }
  });

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Update tierPrices in form state when local tiers change
  useEffect(() => {
    const obj = {};
    tiers.forEach(t => {
      if (t.qty > 0 && t.price > 0) {
        obj[t.qty] = t.price;
      }
    });
    handleChange("tierPrices", JSON.stringify(obj));
  }, [tiers, handleChange]);

  const handleAddTier = useCallback(() => {
    setTiers(prev => [...prev, { qty: "", price: "" }]);
  }, []);

  const handleRemoveTier = useCallback((index) => {
    setTiers(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleTierChange = useCallback((index, field, value) => {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: Number(value) || value } : t));
  }, []);

  // Live Eco Score preview (useMemo avoids recomputation on unrelated form field changes)
  const ecoScorePreview = useMemo(
    () => calculateEcoScore({
      materialType: form.materialType,
      packagingType: form.packagingType,
      recyclability: form.recyclability,
      isRenewableEnergy: !!form.isRenewableEnergy,
      lifespanYears: form.lifespanYears
    }),
    [form.materialType, form.packagingType, form.recyclability, form.isRenewableEnergy, form.lifespanYears]
  );

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const validation = validateProductForm(form, t);
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      onSubmit({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        moq: Number(form.moq),
        organic: Number(form.organic),
        recyclability: Number(form.recyclability),
        isRenewableEnergy: form.isRenewableEnergy ? 1 : 0,
        lifespanYears: Number(form.lifespanYears)
      });
    }
  }, [form, onSubmit, t]);

  return (
    <form onSubmit={handleSubmit} className="fc-product-form">

      <FormField label={t("productName")} error={errors.name}>
        <input className={`fc-input ${errors.name ? "fc-input-error" : ""}`} value={form.name}
          onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Bamboo Fiber Lunch Box" required />
      </FormField>

      <div className="fc-form-row">
        <FormField label={t("categoryLabel")} error={errors.category}>
          <select className="fc-select" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label={t("gradeLabel")} error={errors.grade}>
          <select className="fc-select" value={form.grade} onChange={(e) => handleChange("grade", e.target.value)}>
            {GRADES.map((g) => <option key={g} value={g}>Quality Grade {g}</option>)}
          </select>
        </FormField>
      </div>

      <div className="fc-form-row">
        <FormField label={t("priceLabel")} error={errors.price}>
          <input type="number" min="1" className={`fc-input ${errors.price ? "fc-input-error" : ""}`} value={form.price}
            onChange={(e) => handleChange("price", e.target.value)} placeholder="599" required />
        </FormField>
        <FormField label={t("unitLabel")} error={errors.unit}>
          <select className="fc-select" value={form.unit} onChange={(e) => handleChange("unit", e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormField>
      </div>

      <div className="fc-form-row">
        <FormField label={t("stockLabel")} error={errors.stock}>
          <input type="number" min="1" className={`fc-input ${errors.stock ? "fc-input-error" : ""}`} value={form.stock}
            onChange={(e) => handleChange("stock", e.target.value)} placeholder="50" required />
        </FormField>
        <FormField label={t("moq") || "Min Order Quantity"}>
          <input type="number" min="1" className="fc-input" value={form.moq}
            onChange={(e) => handleChange("moq", e.target.value)} placeholder="1" required />
        </FormField>
      </div>

      <div className="fc-form-row">
        <FormField label={t("harvestDate") || "Listed / Batch Date"}>
          <input type="date" className="fc-input" value={form.harvestDate}
            onChange={(e) => handleChange("harvestDate", e.target.value)} />
        </FormField>
        <FormField label={t("imageUrl") || "Product Image URL"}>
          <input className="fc-input" value={form.imageUrl}
            onChange={(e) => handleChange("imageUrl", e.target.value)} placeholder="https://..." />
        </FormField>
      </div>

      <div className="fc-mb-16">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>
          <input type="checkbox" checked={!!form.organic} onChange={(e) => handleChange("organic", e.target.checked ? 1 : 0)} style={{ width: 16, height: 16 }} />
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
              {MATERIAL_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label} ({m.points} pts)</option>)}
            </select>
          </FormField>
          <FormField label="Packaging Type">
            <select className="fc-select" value={form.packagingType} onChange={(e) => handleChange("packagingType", e.target.value)}>
              {PACKAGING_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.points} pts)</option>)}
            </select>
          </FormField>
        </div>

        <div className="fc-form-row">
          <FormField label="Recyclability (%)">
            <input type="number" min="0" max="100" className="fc-input" value={form.recyclability}
              onChange={(e) => handleChange("recyclability", e.target.value)} />
          </FormField>
          <FormField label="Product Lifespan (years)">
            <input type="number" min="0" step="0.5" className="fc-input" value={form.lifespanYears}
              onChange={(e) => handleChange("lifespanYears", e.target.value)} />
          </FormField>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: "bold", cursor: "pointer", marginTop: 4 }}>
          <input type="checkbox" checked={!!form.isRenewableEnergy} onChange={(e) => handleChange("isRenewableEnergy", e.target.checked ? 1 : 0)} style={{ width: 16, height: 16 }} />
          ☀️ Manufactured using renewable / solar energy
        </label>
      </div>

      {/* Wholesale Pricing Tiers Builder */}
      <div className="fc-panel" style={{ border: "1px solid var(--border)", padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>📈 {t("wholesaleTiers") || "Bulk Pricing Tiers"}</strong>
          <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>+ {t("addTier") || "Add Tier"}</Button>
        </div>

        {tiers.length === 0 ? (
          <p className="fc-soft" style={{ fontSize: 11, fontStyle: "italic" }}>{t("noTiers") || "No bulk discounts added. Sell at base price for all order sizes."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tiers.map((tier, index) => (
              <div key={index} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, width: 60 }}>≥</span>
                <input type="number" min="1" className="fc-input" style={{ width: 80 }} value={tier.qty} onChange={(e) => handleTierChange(index, "qty", e.target.value)} placeholder="10" required />
                <span style={{ fontSize: 12 }}>{form.unit}, ₹</span>
                <input type="number" min="1" className="fc-input" style={{ width: 80 }} value={tier.price} onChange={(e) => handleTierChange(index, "price", e.target.value)} placeholder="39" required />
                <span style={{ fontSize: 12 }}>/{form.unit}</span>
                <button type="button" className="fc-link-btn" style={{ color: "var(--danger)" }} onClick={() => handleRemoveTier(index)}>{t("common.delete") || "Remove"}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormField label={t("descriptionLabel")} error={errors.description}>
        <textarea className={`fc-textarea ${errors.description ? "fc-textarea-error" : ""}`} value={form.description}
          onChange={(e) => handleChange("description", e.target.value)} placeholder="Describe the materials, sustainability benefits, and use-case..." rows={3} />
      </FormField>

      <div className="fc-flex" style={{ justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>
        <Button type="submit" variant="primary">{initialValue ? "Save Changes & Resubmit" : "Submit for Admin Approval"}</Button>
      </div>
    </form>
  );
}


export const ProductForm = memo(ProductFormBase);
export default ProductForm;

import React from "react";

export function AiLanguageSelector({ language, onSelectLanguage }) {
  const languages = [
    { code: "en-IN", label: "English 🇬🇧" },
    { code: "ta-IN", label: "தமிழ் 🇮🇳" },
    { code: "hi-IN", label: "हिन्दी 🇮🇳" }
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "var(--bg-soft)",
        padding: "3px 4px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)"}}
    >
      {languages.map((lang) => {
        const isSelected = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onSelectLanguage(lang.code)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "none",
              fontSize: "11px",
              fontWeight: isSelected ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: isSelected ? "var(--brand)" : "transparent",
              color: isSelected ? "#ffffff" : "var(--text-muted)",
              boxShadow: isSelected ? "var(--shadow-xs)" : "none"
            }}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}

export default AiLanguageSelector;

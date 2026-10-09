import { useRef, useEffect } from "react";

export function OTPInput({ value = "", onChange, length = 6, disabled = false, error = false }) {
  const inputRefs = useRef([]);

  // Convert string value to array of characters
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    // Focus first empty input on mount or reset
    if (!value && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [value]);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, ""); // Keep only numeric digits
    if (!val) return;

    // Take the last entered character if multiple typed
    const char = val.slice(-1);

    const newDigits = [...digits];
    newDigits[index] = char;
    const newCombined = newDigits.join("");
    onChange(newCombined);

    // Auto-focus next input box
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        // Clear current digit
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0 && inputRefs.current[index - 1]) {
        // Focus previous input and clear it
        inputRefs.current[index - 1].focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      // Focus last pasted box or next empty box
      const targetIndex = Math.min(pastedData.length, length - 1);
      if (inputRefs.current[targetIndex]) {
        inputRefs.current[targetIndex].focus();
      }
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "16px 0" }}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          style={{
            width: "48px",
            height: "56px",
            textAlign: "center",
            fontSize: "22px",
            fontWeight: "800",
            fontFamily: "monospace",
            borderRadius: "12px",
            border: error
              ? "2px solid var(--danger, #ef4444)"
              : digits[index]
              ? "2px solid var(--brand, #10b981)"
              : "1.5px solid var(--border, #cbd5e1)",
            background: disabled ? "var(--bg-soft, #f8fafc)" : "#ffffff",
            color: "var(--text, #0f172a)",
            outline: "none",
            boxShadow: digits[index] ? "0 4px 12px rgba(16, 185, 129, 0.15)" : "none",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--brand, #10b981)";
            e.target.select();
          }}
          onBlur={(e) => {
            if (!digits[index]) {
              e.target.style.borderColor = error ? "var(--danger, #ef4444)" : "var(--border, #cbd5e1)";
            }
          }}
        />
      ))}
    </div>
  );
}

export default OTPInput;

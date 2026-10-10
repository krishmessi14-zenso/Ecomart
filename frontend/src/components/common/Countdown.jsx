import { useState, useEffect } from "react";

export function Countdown({ seconds = 60, onComplete, onResend, disabled = false }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const restartTimer = () => {
    setTimeLeft(seconds);
    if (onResend) onResend();
  };

  const isCounting = timeLeft > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", marginTop: "10px" }}>
      <span style={{ color: "var(--text-soft, #64748b)" }}>
        {isCounting ? (
          <span>Resend code available in <strong>{timeLeft}s</strong></span>
        ) : (
          <span>Didn't receive the code?</span>
        )}
      </span>

      <button
        type="button"
        disabled={isCounting || disabled}
        onClick={restartTimer}
        style={{
          background: "none",
          border: "none",
          color: isCounting || disabled ? "var(--text-muted, #94a3b8)" : "var(--brand, #059669)",
          fontWeight: 700,
          cursor: isCounting || disabled ? "not-allowed" : "pointer",
          textDecoration: isCounting || disabled ? "none" : "underline",
          fontSize: "13px",
          padding: "4px 8px",
          borderRadius: "6px",
          transition: "all 0.2s ease",
        }}
      >
        Resend OTP Code
      </button>
    </div>
  );
}

export default Countdown;

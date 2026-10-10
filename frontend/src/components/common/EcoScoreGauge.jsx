import { memo } from "react";

function EcoScoreGaugeBase({ score = 0, size = 120, strokeWidth = 10, showLabel = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.min(100, Math.max(0, score || 0));
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  // Determine color based on eco score
  let color = "#059669"; // Emerald (High)
  let statusText = "High Circularity";
  if (validScore < 50) {
    color = "#ef4444"; // Red (Low)
    statusText = "Needs Improvement";
  } else if (validScore < 75) {
    color = "#f59e0b"; // Amber (Moderate)
    statusText = "Moderate Impact";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--bg-soft, #e2e8f0)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease" }}
          />
        </svg>
        {/* Center Text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: size * 0.28, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
            {validScore}
          </span>
          <span style={{ fontSize: size * 0.11, color: "var(--text-muted)", fontWeight: 600 }}>/100</span>
        </div>
      </div>
      {showLabel && (
        <span
          style={{
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            color,
            background: `${color}15`,
            padding: "2px 8px",
            borderRadius: 10,
          }}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}

export const EcoScoreGauge = memo(EcoScoreGaugeBase);
export default EcoScoreGauge;

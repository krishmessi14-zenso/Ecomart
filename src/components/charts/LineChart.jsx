import { memo, useMemo } from "react";

function LineChartBase({ data = [], color = "var(--brand)", height = 220, chartId = "fc-line" }) {
  const { points, path, areaPath } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { points: [], path: "", areaPath: "" };
    }
    const values = data.map((d) => Number(d?.value) || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const w = 620;
    const stepX = data.length > 1 ? w / (data.length - 1) : w / 2;
    const usableH = height - 40;
    const points = data.map((d, i) => {
      const x = data.length === 1 ? w / 2 : i * stepX;
      const val = Number(d?.value) || 0;
      const range = max - min || 1;
      const y = usableH - ((val - min) / range) * usableH + 10;
      return {
        id: `pt-${i}-${d?.label || i}`,
        x: isNaN(x) ? 0 : x,
        y: isNaN(y) ? usableH : y,
        label: String(d?.label || i),
        value: val
      };
    });
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = `${path} L${points[points.length - 1]?.x || 0},${usableH + 10} L${points[0]?.x || 0},${usableH + 10} Z`;
    return { points, path, areaPath };
  }, [data, height]);

  const gradId = `grad-${chartId}`;

  if (!points.length) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-soft)", fontSize: 13, fontStyle: "italic" }}>
        No analytics data available.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 620 ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="0.7s" fill="freeze" />
      </path>
      {points.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r="3.5" fill={color} />
      ))}
      {points.map((p) => (
        <text key={`t-${p.id}`} x={p.x} y={height - 6} textAnchor="middle" fontSize="10.5" fill="var(--text-soft)">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

export const LineChart = memo(LineChartBase);
export default LineChart;

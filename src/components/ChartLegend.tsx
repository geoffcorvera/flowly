export const CHART_SERIES = [
  { c: "#10b981", l: "Income" },
  { c: "#06b6d4", l: "Savings" },
  { c: "#a78bfa", l: "Investment" },
  { c: "#f59e0b", l: "Retirement" },
  { c: "#f43f5e", l: "Spending" },
  { c: "#475569", l: "Net", dash: true },
] as const;

export function ChartLegend() {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94a3b8", flexWrap: "wrap" }}>
      {CHART_SERIES.map(x => (
        <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {"dash" in x
            ? <span style={{ width: 14, height: 2, background: "#475569", display: "inline-block", borderRadius: 1 }} />
            : <span style={{ width: 8, height: 8, borderRadius: 2, background: x.c, display: "inline-block" }} />}
          {x.l}
        </span>
      ))}
    </div>
  );
}

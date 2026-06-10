import { $ } from "../utils/format";
import type { Totals } from "../types";

interface KpiBarProps {
  totals: Totals;
  period: string;
}

const KPI_DEFS = [
  { key: "income"      as const, label: "Income",     color: "#10b981", sign: "" },
  { key: "savings"     as const, label: "Savings",    color: "#06b6d4", sign: "" },
  { key: "investments" as const, label: "Investment", color: "#a78bfa", sign: "" },
  { key: "retirement"  as const, label: "Retirement", color: "#f59e0b", sign: "" },
  { key: "needs"       as const, label: "Needs",      color: "#f97316", sign: "-" },
  { key: "wants"       as const, label: "Wants",      color: "#ec4899", sign: "-" },
  { key: "net"         as const, label: "Net",        color: null,      sign: "" },
];

export function KpiBar({ totals, period }: KpiBarProps) {
  const periodLabel = period === "All" ? "All time" : `Last ${period}`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 7, marginBottom: 14 }}>
      {KPI_DEFS.map(k => {
        const color = k.key === "net" ? (totals.net >= 0 ? "#475569" : "#f43f5e") : k.color!;
        return (
          <div key={k.label} style={{ background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 10, padding: "10px", borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 8, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color }}>{k.sign}{$(totals[k.key])}</div>
            <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{periodLabel}</div>
          </div>
        );
      })}
    </div>
  );
}

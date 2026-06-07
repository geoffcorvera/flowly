import { NAV } from "../constants";

interface SidebarProps {
  view: string;
  txnCount: number;
  onNavTo: (v: string) => void;
  onImport: () => void;
}

export function Sidebar({ view, txnCount, onNavTo, onImport }: SidebarProps) {
  return (
    <div style={{ width: 178, flexShrink: 0, background: "#0d1117", display: "flex", flexDirection: "column", padding: "18px 0" }}>
      <div style={{ padding: "0 16px 22px", display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-chart-arrows-vertical" style={{ fontSize: 18, color: "#10b981" }} aria-hidden />
        <span style={{ fontSize: 15, fontWeight: 500, color: "#e2e8f0", letterSpacing: "-.01em" }}>Flowly</span>
      </div>
      <div style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: ".1em", padding: "0 16px 5px" }}>Menu</div>
      {NAV.map(n => (
        <div
          key={n.id}
          onClick={() => onNavTo(n.id)}
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 16px", fontSize: 13, cursor: "pointer", color: view === n.id ? "#f1f5f9" : "#6b7280", background: view === n.id ? "rgba(255,255,255,.06)" : "transparent", borderLeft: view === n.id ? "2px solid #10b981" : "2px solid transparent", transition: "all .12s" }}
        >
          <i className={`ti ${n.icon}`} style={{ fontSize: 15 }} aria-hidden />{n.label}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: "0 16px 14px" }}>
        <button onClick={onImport} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 0", fontSize: 12, cursor: "pointer", color: "#6b7280", background: "none", border: "none", textAlign: "left" }}>
          <i className="ti ti-upload" style={{ fontSize: 14, color: "#10b981" }} aria-hidden />Import CSV
        </button>
      </div>
      <div style={{ padding: "12px 16px 0", borderTop: "1px solid #1c2333", fontSize: 10 }}>
        {txnCount > 0
          ? <span style={{ color: "#10b981" }}>✓ {txnCount} transactions</span>
          : <span style={{ color: "#f59e0b" }}>No data imported yet</span>}
      </div>
    </div>
  );
}

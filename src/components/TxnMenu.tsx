import type { Transaction } from "../types";

interface TxnMenuProps {
  t: Transaction;
  menuId: string | null;
  onToggle: (id: string) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TxnMenu({ t, menuId, onToggle, onEdit, onDelete }: TxnMenuProps) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); onToggle(t.id); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "3px 7px", fontSize: 18, lineHeight: 1, borderRadius: 6 }}
      >⋮</button>
      {menuId === t.id && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 2px)", background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 10, padding: "4px", zIndex: 30, minWidth: 130 }}>
          <button onClick={() => onEdit(t)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", fontSize: 12, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-primary)", borderRadius: 7 }}>
            <i className="ti ti-edit" style={{ fontSize: 14, color: "#6366f1" }} aria-hidden />Edit date &amp; split
          </button>
          <button onClick={() => onDelete(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", fontSize: 12, background: "none", border: "none", cursor: "pointer", color: "#ef4444", borderRadius: 7 }}>
            <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden />Delete
          </button>
        </div>
      )}
    </div>
  );
}

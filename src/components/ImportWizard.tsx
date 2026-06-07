import type { RefObject } from "react";
import { S_IN, s_btn } from "../constants";
import type { ColMap } from "../types";

interface ImportWizardProps {
  step: "drop" | "map";
  headers: string[];
  rows: Record<string, string>[];
  colMap: ColMap;
  onColMap: (m: ColMap) => void;
  onFile: (f: File | null) => void;
  onImport: () => void;
  onBack: () => void;
  onCancel?: () => void;
  fileRef: RefObject<HTMLInputElement | null>;
  showCancel: boolean;
}

export function ImportWizard({ step, headers, rows, colMap, onColMap, onFile, onImport, onBack, onCancel, fileRef, showCancel }: ImportWizardProps) {
  const can = colMap.date && colMap.amount && colMap.description;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        {(["Upload file", "Map columns"] as const).map((s, i) => {
          const active = (i === 0 && step === "drop") || (i === 1 && step === "map");
          const done = i === 0 && step === "map";
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, background: done ? "#10b981" : active ? "#6366f1" : "#f1f5f9", color: done || active ? "#fff" : "#94a3b8" }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, color: active ? "var(--color-text-primary)" : done ? "#10b981" : "#94a3b8", fontWeight: active ? 500 : 400 }}>{s}</span>
              {i === 0 && <span style={{ color: "#d1d5db", margin: "0 3px", fontSize: 14 }}>›</span>}
            </div>
          );
        })}
        {showCancel && (
          <button onClick={onCancel} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>✕</button>
        )}
      </div>

      {step === "drop" && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
            style={{ border: "2px dashed #dde1e8", borderRadius: 12, padding: "40px 24px", textAlign: "center", cursor: "pointer", background: "#f8fafc", marginBottom: 14 }}
          >
            <i className="ti ti-file-spreadsheet" style={{ fontSize: 32, color: "#c8d0da", display: "block", marginBottom: 12 }} aria-hidden />
            <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>Drop your CSV here</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>or click to browse files</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {["Chase", "Bank of America", "Wells Fargo", "Fidelity", "Schwab", "Any format"].map(b => (
                <span key={b} style={{ fontSize: 10, background: "#f1f5f9", color: "#6b7280", padding: "2px 8px", borderRadius: 10 }}>{b}</span>
              ))}
            </div>
          </div>
          <input type="file" accept=".csv" ref={fileRef} onChange={e => onFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, textAlign: "center" }}>
            <i className="ti ti-lock" style={{ fontSize: 12, verticalAlign: "-1px", marginRight: 4 }} aria-hidden />All data stays on your device
          </p>
        </>
      )}

      {step === "map" && (
        <>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 14px" }}>{rows.length.toLocaleString()} rows · {headers.length} columns detected.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {([
              { f: "date" as const,        l: "Date",        req: true },
              { f: "amount" as const,      l: "Amount",      req: true },
              { f: "description" as const, l: "Description", req: true },
              { f: "category" as const,    l: "Category",    req: false },
              { f: "account" as const,     l: "Account",     req: false },
            ]).map(({ f, l, req }) => (
              <div key={f}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4, fontWeight: 500 }}>
                  {l}{req && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
                  {colMap[f] && <span style={{ color: "#10b981", marginLeft: 5, fontSize: 10 }}>✓ detected</span>}
                </label>
                <select
                  value={colMap[f]}
                  onChange={e => onColMap({ ...colMap, [f]: e.target.value })}
                  style={{ ...S_IN, border: `0.5px solid ${colMap[f] ? "#10b981" : "#e4e9f0"}`, color: colMap[f] ? "var(--color-text-primary)" : "#94a3b8" }}
                >
                  <option value="">{req ? "— select —" : "— optional —"}</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Preview · first 3 rows</div>
            <div style={{ border: "0.5px solid #e4e9f0", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {(["date", "description", "amount", "category"] as const).filter(k => colMap[k]).map(k => (
                      <th key={k} style={{ padding: "6px 8px", textAlign: "left", color: "#94a3b8", fontWeight: 500, borderBottom: "0.5px solid #e4e9f0", textTransform: "capitalize" }}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "0.5px solid #f8fafc" }}>
                      {(["date", "description", "amount", "category"] as const).filter(k => colMap[k]).map(k => (
                        <td key={k} style={{ padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[colMap[k]] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={onBack} style={s_btn("#f1f5f9", "#64748b")}>← Back</button>
            <button onClick={onImport} disabled={!can} style={s_btn(can ? "#6366f1" : "#f1f5f9", can ? "#fff" : "#94a3b8")}>
              Import {rows.length.toLocaleString()} transactions →
            </button>
          </div>
        </>
      )}
    </>
  );
}

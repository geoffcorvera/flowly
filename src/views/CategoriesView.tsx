import type React from "react";
import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RChart } from "recharts";
import { TYPE_LABELS } from "../constants";
import { S_IN, s_btn } from "../constants";
import { $ } from "../utils/format";
import type { Transaction, Category } from "../types";

interface CategoriesViewProps {
  cats: Category[];
  txns: Transaction[];
  catData: { name: string; value: number }[];
  onCatsChange: (cats: Category[]) => void;
  onTxnsChange: (txns: Transaction[]) => void;
}

const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px" };

export function CategoriesView({ cats, txns, catData, onCatsChange, onTxnsChange }: CategoriesViewProps) {
  const [editCat, setEditCat] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", color: "#6366f1", type: "expense" });
  const [delCatId, setDelCatId] = useState<string | null>(null);

  const catColor = (n: string) => cats.find(c => c.name === n)?.color || "#94a3b8";
  const catTotal = catData.reduce((s, c) => s + c.value, 0);

  const openAddCat = () => { setCatForm({ name: "", color: "#6366f1", type: "expense" }); setEditCat("new"); };
  const openEditCat = (c: Category) => { setCatForm({ name: c.name, color: c.color, type: c.type || "expense" }); setEditCat(c.id); };

  const saveCat = () => {
    if (editCat === "new") {
      onCatsChange([...cats, { id: `c${Date.now()}`, name: catForm.name, color: catForm.color, type: catForm.type as Category["type"] }]);
    } else {
      const old = cats.find(c => c.id === editCat);
      if (old?.name !== catForm.name) {
        onTxnsChange(txns.map(t => t.category === old?.name ? { ...t, category: catForm.name } : t));
      }
      onCatsChange(cats.map(c => c.id === editCat ? { ...c, ...catForm, type: catForm.type as Category["type"] } : c));
    }
    setEditCat(null);
  };

  const confirmDelCat = (id: string) => {
    const cat = cats.find(c => c.id === id);
    if (cat) {
      onTxnsChange(txns.map(t => t.category === cat.name ? { ...t, category: "Other" } : t));
      onCatsChange(cats.filter(c => c.id !== id));
    }
    setDelCatId(null);
  };

  return (
    <>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Manage categories</span>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Category type controls chart placement and totals</div>
          </div>
          <button onClick={openAddCat} style={{ ...s_btn("#6366f1"), display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", fontSize: 11, flexShrink: 0, marginLeft: 12 }}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} aria-hidden />Add
          </button>
        </div>

        <div style={{ padding: "9px 12px", background: "#fffbeb", border: "0.5px solid #fde68a", borderRadius: 8, marginBottom: 12, fontSize: 11, color: "#92400e" }}>
          💡 <strong>Retirement contributions</strong> (401k, IRA, HSA) rarely appear in bank statements since they're payroll deductions. Add them manually in Transactions using the "Retirement" category to track the full picture alongside bank data.
        </div>

        {editCat === "new" && (
          <div style={{ background: "#f8fafc", border: "0.5px solid #c7d2e0", borderRadius: 10, padding: "14px", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>New category</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Name</label>
                <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HSA" style={S_IN} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Color</label>
                <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} style={{ width: "100%", height: 36, borderRadius: 8, border: "0.5px solid #e4e9f0", cursor: "pointer", padding: 2 }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Type</label>
                <select value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))} style={S_IN}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditCat(null)} style={s_btn("#f1f5f9", "#64748b")}>Cancel</button>
              <button onClick={saveCat} disabled={!catForm.name} style={s_btn(!catForm.name ? "#f1f5f9" : "#6366f1", !catForm.name ? "#94a3b8" : "#fff")}>Add</button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(195px,1fr))", gap: 8 }}>
          {cats.map(c => {
            const isEd = editCat === c.id;
            const count = txns.filter(t => t.category === c.name).length;
            return (
              <div key={c.id} style={{ border: "0.5px solid #e4e9f0", borderRadius: 8, padding: "10px 12px", background: isEd ? "#f8fafc" : "#fff" }}>
                {isEd ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 44px", gap: 6, marginBottom: 6 }}>
                      <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} style={{ ...S_IN, fontSize: 12 }} />
                      <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} style={{ width: "100%", height: 35, borderRadius: 8, border: "0.5px solid #e4e9f0", cursor: "pointer", padding: 2 }} />
                    </div>
                    <select value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))} style={{ ...S_IN, fontSize: 11, marginBottom: 6 }}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => setEditCat(null)} style={{ ...s_btn("#f1f5f9", "#64748b"), fontSize: 11, padding: "4px 8px", flex: 1 }}>Cancel</button>
                      <button onClick={saveCat} style={{ ...s_btn("#6366f1"), fontSize: 11, padding: "4px 8px", flex: 1 }}>Save</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>{TYPE_LABELS[c.type] || c.type} · {count}</div>
                    </div>
                    <button onClick={() => openEditCat(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px 3px", fontSize: 13 }}>
                      <i className="ti ti-edit" aria-hidden />
                    </button>
                    {delCatId === c.id ? (
                      <div style={{ display: "flex", gap: 3 }}>
                        <button onClick={() => confirmDelCat(c.id)} style={{ fontSize: 10, background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer" }}>Yes</button>
                        <button onClick={() => setDelCatId(null)} style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer" }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDelCatId(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px 3px", fontSize: 13 }}>
                        <i className="ti ti-trash" aria-hidden />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Spending &amp; saving breakdown</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{$(catTotal)} total</span>
        </div>
        {catData.length === 0
          ? <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No data yet.</p>
          : (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <ResponsiveContainer width={155} height={155}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="value" paddingAngle={2}>
                    {catData.map((d, i) => <Cell key={i} fill={catColor(d.name)} />)}
                  </Pie>
                  <RChart formatter={(v) => $(Number(v))} contentStyle={{ background: "#0d1117", border: "none", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, minWidth: 200 }}>
                {catData.map(d => {
                  const pct = catTotal > 0 ? Math.round(d.value / catTotal * 100) : 0;
                  return (
                    <div key={d.name} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: catColor(d.name) }} />
                          <span style={{ fontWeight: 500 }}>{d.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ color: "#94a3b8" }}>{pct}%</span>
                          <span style={{ fontWeight: 500 }}>{$(d.value)}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4 }}>
                        <div style={{ height: 4, width: `${pct}%`, background: catColor(d.name), borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </>
  );
}

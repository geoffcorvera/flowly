import { S_IN, s_btn } from "../constants";
import { $d } from "../utils/format";
import type { Category } from "../types";

export interface TxnFormState {
  date: string;
  name: string;
  amount: string;
  category: string;
  split: number;
}

interface TxnFormProps {
  form: TxnFormState;
  onChange: (f: TxnFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  cats: Category[];
  isNew: boolean;
}

export function TxnForm({ form, onChange, onSave, onCancel, cats, isNew }: TxnFormProps) {
  const catColor = (n: string) => cats.find(c => c.name === n)?.color || "#94a3b8";
  const disabled = !form.name || !form.amount || !form.date;
  const share = form.split > 1 ? $d((parseFloat(form.amount) || 0) / form.split) : null;
  return (
    <div style={{ background: "#f8fafc", border: "0.5px solid #c7d2e0", borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>{isNew ? "New transaction" : "Edit transaction (date & split)"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Date</label>
          <input type="date" value={form.date} onChange={e => onChange({ ...form, date: e.target.value })} style={S_IN} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>
            Amount <span style={{ color: "#c8d0da" }}>(negative = expense)</span>
          </label>
          <input type="number" placeholder="-25.00" value={form.amount} onChange={e => onChange({ ...form, amount: e.target.value })} style={S_IN} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Name / Description</label>
          <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} style={S_IN} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Category</label>
          <select value={form.category} onChange={e => onChange({ ...form, category: e.target.value })} style={{ ...S_IN, color: catColor(form.category) }}>
            {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 }}>Split N ways</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min="1" max="20" value={form.split} onChange={e => onChange({ ...form, split: Math.max(1, parseInt(e.target.value) || 1) })} style={{ ...S_IN, width: 64 }} />
            {share && <span style={{ fontSize: 11, color: "#6366f1" }}>= {share} your share</span>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={s_btn("#f1f5f9", "#64748b")}>Cancel</button>
        <button onClick={onSave} disabled={disabled} style={s_btn(disabled ? "#f1f5f9" : "#6366f1", disabled ? "#94a3b8" : "#fff")}>
          {isNew ? "Add" : "Save"}
        </button>
      </div>
    </div>
  );
}

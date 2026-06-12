import type React from "react";
import { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RChart } from "recharts";
import { TYPE_LABELS, S_IN, s_btn } from "../constants";
import { $ } from "../utils/format";
import { catColor, nodeTotal, nextColor, subtreeLabels } from "../utils/categories";
import type { Transaction, Category, CategoryType } from "../types";

interface CategoriesViewProps {
  cats: Category[];
  txns: Transaction[];
  catData: { name: string; value: number }[];
  onCatsChange: (cats: Category[]) => void;
  onTxnsChange: (txns: Transaction[]) => void;
}

const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px" };

// ── Layout geometry ────────────────────────────────────────────────────────────
const COL_W = 232;   // distance between successive column left edges
const CARD_W = 184;
const CARD_H = 48;
const ROW_H = 64;    // vertical slot height per leaf node
const PAD = 14;

interface Placed { node: Category; depth: number; x: number; y: number; parentId: string | null }

interface Layout { placed: Placed[]; width: number; height: number }

/** Deterministic tidy-tree layout: leaves stack top-to-bottom; parents center on children. */
function layoutTree(cats: Category[]): Layout {
  const placed: Placed[] = [];
  let slot = 0;

  const place = (node: Category, depth: number, parentId: string | null): number => {
    let yc: number;
    if (node.subcategories.length === 0) {
      yc = slot * ROW_H + ROW_H / 2;
      slot += 1;
    } else {
      const childYs = node.subcategories.map(c => place(c, depth + 1, node.id));
      yc = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }
    placed.push({ node, depth, x: depth * COL_W, y: yc, parentId });
    return yc;
  };

  cats.forEach(r => place(r, 0, null));
  const maxDepth = placed.reduce((m, p) => Math.max(m, p.depth), 0);
  return {
    placed,
    width: maxDepth * COL_W + CARD_W + PAD * 2,
    height: Math.max(slot, 1) * ROW_H + PAD * 2,
  };
}

// ── Tree mutation helpers ────────────────────────────────────────────────────────
const replaceNode = (cats: Category[], updated: Category): Category[] =>
  cats.map(c => c.id === updated.id ? updated : { ...c, subcategories: replaceNode(c.subcategories, updated) });

const removeNode = (cats: Category[], id: string): Category[] =>
  cats.filter(c => c.id !== id).map(c => ({ ...c, subcategories: removeNode(c.subcategories, id) }));

const insertChild = (cats: Category[], parentId: string, child: Category): Category[] =>
  cats.map(c => c.id === parentId
    ? { ...c, subcategories: [...c.subcategories, child] }
    : { ...c, subcategories: insertChild(c.subcategories, parentId, child) });

// ── Editor state ───────────────────────────────────────────────────────────────
interface EditorState {
  mode: "edit" | "add";
  id?: string;             // node being edited (edit mode)
  parentId: string | null; // parent for the new node (add mode)
  label: string;
  color: string;
  type: CategoryType;
  hidden: boolean;
  manualEnabled: boolean;
  manualValue: string;
}

export function CategoriesView({ cats, txns, catData, onCatsChange, onTxnsChange }: CategoriesViewProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { placed, width, height } = useMemo(() => layoutTree(cats), [cats]);
  const posById = useMemo(() => {
    const m = new Map<string, Placed>();
    placed.forEach(p => m.set(p.node.id, p));
    return m;
  }, [placed]);

  const catTotal = catData.reduce((s, c) => s + c.value, 0);

  // ── Editor open/save ──
  const openEdit = (node: Category) => setEditor({
    mode: "edit", id: node.id, parentId: null,
    label: node.label, color: node.color, type: node.type,
    hidden: !!node.hidden,
    manualEnabled: node.manualValue != null,
    manualValue: node.manualValue != null ? String(node.manualValue) : "",
  });

  const openAdd = (parentId: string | null) => setEditor({
    mode: "add", parentId,
    label: "New category", color: nextColor(cats), type: "expense",
    hidden: false, manualEnabled: false, manualValue: "",
  });

  const saveEditor = () => {
    if (!editor) return;
    const label = editor.label.trim() || "Untitled";
    const manualValue = editor.manualEnabled ? (parseFloat(editor.manualValue) || 0) : undefined;
    const fields = { label, color: editor.color, type: editor.type, hidden: editor.hidden, manualValue };

    if (editor.mode === "edit" && editor.id) {
      const existing = placed.find(p => p.node.id === editor.id)?.node;
      if (existing) {
        const updated: Category = { ...existing, ...fields };
        if (manualValue === undefined) delete updated.manualValue;
        onCatsChange(replaceNode(cats, updated));
      }
    } else {
      const child: Category = {
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        ...fields, subcategories: [],
      };
      if (manualValue === undefined) delete child.manualValue;
      onCatsChange(editor.parentId ? insertChild(cats, editor.parentId, child) : [...cats, child]);
    }
    setEditor(null);
  };

  // ── Delete: reassign matched txns (incl. descendants) to "Other", remove subtree ──
  const deleteNode = (node: Category) => {
    const labels = new Set(subtreeLabels(node));
    onTxnsChange(txns.map(t => labels.has(t.category) ? { ...t, category: "Other" } : t));
    onCatsChange(removeNode(cats, node.id));
    setConfirmDelId(null);
  };

  return (
    <>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Categories</span>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              Root → leaf. This tree drives the Flow Chart. Hidden categories aggregate their children and can't be assigned to transactions.
            </div>
          </div>
          <button onClick={() => openAdd(null)} style={{ ...s_btn("#6366f1"), display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", fontSize: 11, flexShrink: 0, marginLeft: 12 }}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} aria-hidden />Add root
          </button>
        </div>

        {/* Graph canvas */}
        <div style={{ overflowX: "auto", overflowY: "hidden", paddingTop: 8 }}>
          <div style={{ position: "relative", width, height, minWidth: "100%" }}>
            {/* Connector layer */}
            <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {placed.map(p => {
                if (!p.parentId) return null;
                const parent = posById.get(p.parentId);
                if (!parent) return null;
                const x1 = parent.x + PAD + CARD_W;
                const y1 = parent.y + PAD;
                const x2 = p.x + PAD;
                const y2 = p.y + PAD;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={p.node.id}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={parent.node.color}
                    strokeWidth={2}
                    strokeOpacity={0.4}
                  />
                );
              })}
            </svg>

            {/* Node cards */}
            {placed.map(p => {
              const { node } = p;
              const isHover = hoverId === node.id;
              const confirming = confirmDelId === node.id;
              const value = nodeTotal(node, txns);
              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoverId(node.id)}
                  onMouseLeave={() => setHoverId(h => h === node.id ? null : h)}
                  style={{
                    position: "absolute",
                    left: p.x + PAD,
                    top: p.y + PAD - CARD_H / 2,
                    width: CARD_W,
                    height: CARD_H,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 8px 0 10px",
                    background: "#fff",
                    border: "0.5px solid #e4e9f0",
                    borderLeft: `4px solid ${node.color}`,
                    borderRadius: 8,
                    boxShadow: isHover ? "0 2px 8px rgba(0,0,0,.08)" : "none",
                    opacity: node.hidden ? 0.72 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</span>
                      {node.hidden && <i className="ti ti-eye-off" style={{ fontSize: 11, color: "#94a3b8" }} title="Structural — not assignable" aria-hidden />}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      {$(value)}{node.manualValue != null ? " · manual" : ""}
                    </div>
                  </div>

                  {confirming ? (
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => deleteNode(node)} style={{ fontSize: 10, background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 5, padding: "3px 7px", cursor: "pointer" }}>Yes</button>
                      <button onClick={() => setConfirmDelId(null)} style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 5, padding: "3px 7px", cursor: "pointer" }}>No</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 1, opacity: isHover ? 1 : 0.35, transition: "opacity .12s" }}>
                      <button title="Edit" onClick={() => openEdit(node)} style={iconBtn}><i className="ti ti-pencil" aria-hidden /></button>
                      <button title="Add child" onClick={() => openAdd(node.id)} style={iconBtn}><i className="ti ti-plus" aria-hidden /></button>
                      {node.label !== "Other" && (
                        <button title="Delete" onClick={() => setConfirmDelId(node.id)} style={iconBtn}><i className="ti ti-trash" aria-hidden /></button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spending breakdown */}
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
                    {catData.map((d, i) => <Cell key={i} fill={catColor(cats, d.name)} />)}
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
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: catColor(cats, d.name) }} />
                          <span style={{ fontWeight: 500 }}>{d.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ color: "#94a3b8" }}>{pct}%</span>
                          <span style={{ fontWeight: 500 }}>{$(d.value)}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4 }}>
                        <div style={{ height: 4, width: `${pct}%`, background: catColor(cats, d.name), borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* Editor modal */}
      {editor && (
        <div
          onClick={() => setEditor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(8,10,15,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", width: 360, maxWidth: "90%", border: "0.5px solid #e4e9f0" }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>
              {editor.mode === "add" ? "New category" : "Edit category"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 52px", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Label</label>
                <input value={editor.label} autoFocus onChange={e => setEditor(s => s && ({ ...s, label: e.target.value }))} style={S_IN} />
              </div>
              <div>
                <label style={lbl}>Color</label>
                <input type="color" value={editor.color} onChange={e => setEditor(s => s && ({ ...s, color: e.target.value }))} style={{ width: "100%", height: 36, borderRadius: 8, border: "0.5px solid #e4e9f0", cursor: "pointer", padding: 2 }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Type</label>
              <select value={editor.type} onChange={e => setEditor(s => s && ({ ...s, type: e.target.value as CategoryType }))} style={S_IN}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={editor.hidden} onChange={e => setEditor(s => s && ({ ...s, hidden: e.target.checked }))} />
              Structural (aggregates children; not assignable to transactions)
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={editor.manualEnabled} onChange={e => setEditor(s => s && ({ ...s, manualEnabled: e.target.checked }))} />
              Set value manually
            </label>
            {editor.manualEnabled && (
              <input type="number" min={0} step={100} placeholder="0" value={editor.manualValue}
                onChange={e => setEditor(s => s && ({ ...s, manualValue: e.target.value }))}
                style={{ ...S_IN, marginBottom: 4 }} />
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setEditor(null)} style={s_btn("#f1f5f9", "#64748b")}>Cancel</button>
              <button onClick={saveEditor} disabled={!editor.label.trim()} style={s_btn(!editor.label.trim() ? "#f1f5f9" : "#6366f1", !editor.label.trim() ? "#94a3b8" : "#fff")}>
                {editor.mode === "add" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px 3px", fontSize: 13,
};

const lbl: React.CSSProperties = { fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3 };

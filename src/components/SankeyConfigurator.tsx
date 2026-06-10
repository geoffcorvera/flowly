import type React from "react";
import { useState } from "react";
import { S_IN, s_btn } from "../constants";
import { $ } from "../utils/format";
import type { SankeyDiagramConfig, SankeyNodeConfig, SankeyValueSource, Category } from "../types";

interface SankeyConfiguratorProps {
  config: SankeyDiagramConfig;
  cats: Category[];
  computedValues: Map<string, number>;
  onChange: (c: SankeyDiagramConfig) => void;
}

// ── Tree mutation helpers ──────────────────────────────────────────────────────

function replaceNode(roots: SankeyNodeConfig[], updated: SankeyNodeConfig): SankeyNodeConfig[] {
  return roots.map(r =>
    r.id === updated.id ? updated : { ...r, children: replaceNode(r.children, updated) }
  );
}

function deleteNode(roots: SankeyNodeConfig[], id: string): SankeyNodeConfig[] {
  return roots
    .filter(r => r.id !== id)
    .map(r => ({ ...r, children: deleteNode(r.children, id) }));
}

function addChild(roots: SankeyNodeConfig[], parentId: string, child: SankeyNodeConfig): SankeyNodeConfig[] {
  return roots.map(r =>
    r.id === parentId
      ? { ...r, children: [...r.children, child] }
      : { ...r, children: addChild(r.children, parentId, child) }
  );
}

function makeNode(): SankeyNodeConfig {
  return {
    id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "New Node",
    color: "#94a3b8",
    valueSource: { type: "manual", amount: 0 },
    children: [],
  };
}

function srcSummary(src: SankeyValueSource): string {
  if (src.type === "manual") return src.amount > 0 ? `manual ${$(src.amount)}` : "manual (unset)";
  if (src.spendingOnly) return src.nameContains ? `expenses · "${src.nameContains}"` : "all expenses";
  if (src.categories?.length) {
    const cats = src.categories.slice(0, 2).join(", ");
    const more = src.categories.length > 2 ? ` +${src.categories.length - 2}` : "";
    const filter = src.nameContains ? ` · "${src.nameContains}"` : "";
    return `${cats}${more}${filter}`;
  }
  return src.nameContains ? `all · "${src.nameContains}"` : "all transactions";
}

// ── Edit form ─────────────────────────────────────────────────────────────────

interface EditFormProps {
  node: SankeyNodeConfig;
  cats: Category[];
  onSave: (updated: SankeyNodeConfig) => void;
  onCancel: () => void;
}

function EditForm({ node, cats, onSave, onCancel }: EditFormProps) {
  const [name, setName] = useState(node.name);
  const [color, setColor] = useState(node.color ?? "#94a3b8");
  const [srcType, setSrcType] = useState<"manual" | "transactions">(node.valueSource.type);
  const [manualAmt, setManualAmt] = useState(
    node.valueSource.type === "manual" ? String(node.valueSource.amount) : "0"
  );
  const [selCats, setSelCats] = useState<string[]>(
    node.valueSource.type === "transactions" ? (node.valueSource.categories ?? []) : []
  );
  const [nameContains, setNameContains] = useState(
    node.valueSource.type === "transactions" ? (node.valueSource.nameContains ?? "") : ""
  );
  const [spendingOnly, setSpendingOnly] = useState(
    node.valueSource.type === "transactions" ? (node.valueSource.spendingOnly ?? false) : false
  );

  const toggleCat = (catName: string) => {
    setSelCats(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleSave = () => {
    const valueSource: SankeyValueSource =
      srcType === "manual"
        ? { type: "manual", amount: parseFloat(manualAmt) || 0 }
        : {
            type: "transactions",
            ...(spendingOnly ? { spendingOnly: true } : selCats.length ? { categories: selCats } : {}),
            ...(nameContains.trim() ? { nameContains: nameContains.trim() } : {}),
          };
    onSave({ ...node, name: name.trim() || node.name, color, valueSource });
  };

  const row: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 };
  const label: React.CSSProperties = { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" };

  return (
    <div style={{ background: "#f8fafc", border: "0.5px solid #e4e9f0", borderRadius: 8, padding: "12px 14px", marginBottom: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
        <div style={row}>
          <span style={label}>Name</span>
          <input style={S_IN} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={row}>
          <span style={label}>Color</span>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 36, height: 32, border: "0.5px solid #e4e9f0", borderRadius: 6, cursor: "pointer", padding: 2 }} />
        </div>
      </div>

      <div style={row}>
        <span style={label}>Value source</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["manual", "transactions"] as const).map(t => (
            <button
              key={t}
              onClick={() => setSrcType(t)}
              style={{
                ...s_btn(srcType === t ? "#6366f1" : "#f1f5f9", srcType === t ? "#fff" : "#374151"),
                fontSize: 11, padding: "5px 10px",
              }}
            >
              {t === "manual" ? "Manual" : "Transactions"}
            </button>
          ))}
        </div>
      </div>

      {srcType === "manual" && (
        <div style={row}>
          <span style={label}>Amount ($)</span>
          <input
            style={S_IN} type="number" min={0} step={100}
            value={manualAmt}
            onChange={e => setManualAmt(e.target.value)}
          />
        </div>
      )}

      {srcType === "transactions" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <input
              type="checkbox" id={`spending-${node.id}`}
              checked={spendingOnly}
              onChange={e => { setSpendingOnly(e.target.checked); if (e.target.checked) setSelCats([]); }}
            />
            <label htmlFor={`spending-${node.id}`} style={{ fontSize: 11, color: "#374151", cursor: "pointer" }}>
              All expense transactions
            </label>
          </div>

          {!spendingOnly && (
            <div style={row}>
              <span style={label}>Categories</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                {cats.map(c => (
                  <label
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 7px", borderRadius: 5, cursor: "pointer", fontSize: 11,
                      background: selCats.includes(c.name) ? c.color + "22" : "#f1f5f9",
                      border: `0.5px solid ${selCats.includes(c.name) ? c.color : "#e4e9f0"}`,
                      color: selCats.includes(c.name) ? "#111827" : "#6b7280",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selCats.includes(c.name)}
                      onChange={() => toggleCat(c.name)}
                      style={{ margin: 0, width: 10, height: 10 }}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={row}>
            <span style={label}>Name contains</span>
            <input
              style={S_IN} placeholder='e.g. "House Fund"'
              value={nameContains}
              onChange={e => setNameContains(e.target.value)}
            />
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button onClick={handleSave} style={s_btn("#6366f1")}>Save</button>
        <button onClick={onCancel} style={s_btn("#f1f5f9", "#374151")}>Cancel</button>
      </div>
    </div>
  );
}

// ── Node row (recursive) ──────────────────────────────────────────────────────

interface NodeRowProps {
  node: SankeyNodeConfig;
  depth: number;
  cats: Category[];
  computedValues: Map<string, number>;
  editNodeId: string | null;
  onSetEdit: (id: string | null) => void;
  onUpdate: (updated: SankeyNodeConfig) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function NodeRow({
  node, depth, cats, computedValues,
  editNodeId, onSetEdit, onUpdate, onDelete, onAddChild,
}: NodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const isEditing = editNodeId === node.id;
  const hasChildren = node.children.length > 0;
  const computedVal = computedValues.get(node.id);

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          paddingLeft: 8, paddingRight: 8, paddingTop: 5, paddingBottom: 5,
          marginLeft: depth * 14,
          borderLeft: `2px solid ${node.color ?? "#e4e9f0"}`,
          background: isEditing ? "#f0f4ff" : "transparent",
          borderRadius: 4,
        }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: "none", border: "none", cursor: hasChildren ? "pointer" : "default", padding: 0, color: hasChildren ? "#6b7280" : "transparent", fontSize: 11, width: 14, flexShrink: 0 }}
        >
          <i className={`ti ${expanded ? "ti-chevron-down" : "ti-chevron-right"}`} />
        </button>

        {/* Color swatch */}
        <div style={{ width: 8, height: 8, borderRadius: 2, background: node.color ?? "#94a3b8", flexShrink: 0 }} />

        {/* Name + source */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{node.name}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 6 }}>{srcSummary(node.valueSource)}</span>
        </div>

        {/* Computed value */}
        {computedVal !== undefined && (
          <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>{$(computedVal)}</span>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          <button
            title="Edit"
            onClick={() => onSetEdit(isEditing ? null : node.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: isEditing ? "#6366f1" : "#9ca3af", fontSize: 13, padding: "1px 3px" }}
          >
            <i className="ti ti-pencil" />
          </button>
          <button
            title="Add child"
            onClick={() => { onAddChild(node.id); setExpanded(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: "1px 3px" }}
          >
            <i className="ti ti-plus" />
          </button>
          <button
            title="Delete"
            onClick={() => onDelete(node.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: "1px 3px" }}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div style={{ paddingLeft: depth * 14 + 22, paddingRight: 8, paddingBottom: 4 }}>
          <EditForm
            node={node}
            cats={cats}
            onSave={updated => { onUpdate(updated); onSetEdit(null); }}
            onCancel={() => onSetEdit(null)}
          />
        </div>
      )}

      {expanded && node.children.map(child => (
        <NodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          cats={cats}
          computedValues={computedValues}
          editNodeId={editNodeId}
          onSetEdit={onSetEdit}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

// ── Main configurator ─────────────────────────────────────────────────────────

export function SankeyConfigurator({ config, cats, computedValues, onChange }: SankeyConfiguratorProps) {
  const [editNodeId, setEditNodeId] = useState<string | null>(null);

  const handleUpdate = (updated: SankeyNodeConfig) => {
    onChange({ roots: replaceNode(config.roots, updated) });
  };

  const handleDelete = (id: string) => {
    const newRoots = deleteNode(config.roots, id);
    onChange({ roots: newRoots });
    if (editNodeId !== null) {
      const exists = (roots: SankeyNodeConfig[], targetId: string): boolean =>
        roots.some(r => r.id === targetId || exists(r.children, targetId));
      if (!exists(newRoots, editNodeId)) setEditNodeId(null);
    }
  };

  const handleAddChild = (parentId: string) => {
    onChange({ roots: addChild(config.roots, parentId, makeNode()) });
  };

  const handleAddRoot = () => {
    onChange({ roots: [...config.roots, makeNode()] });
  };

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Diagram nodes</span>
        <button onClick={handleAddRoot} style={{ ...s_btn("#6366f1"), fontSize: 11, padding: "5px 10px" }}>
          <i className="ti ti-plus" style={{ marginRight: 4 }} />Add root
        </button>
      </div>

      {config.roots.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
          No nodes yet — add a root to get started.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {config.roots.map(root => (
            <NodeRow
              key={root.id}
              node={root}
              depth={0}
              cats={cats}
              computedValues={computedValues}
              editNodeId={editNodeId}
              onSetEdit={setEditNodeId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

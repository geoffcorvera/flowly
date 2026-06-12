import type React from "react";
import { useState, useEffect, Fragment } from "react";
import { Chip } from "../components/Chip";
import { TxnForm, type TxnFormState } from "../components/TxnForm";
import { TxnMenu } from "../components/TxnMenu";
import { ImportWizard } from "../components/ImportWizard";
import { S_IN, s_btn, IE, ED } from "../constants";
import { $, $d } from "../utils/format";
import { eff, buildCsvString } from "../utils/transactions";
import { assignableCats, catColor as lookupCatColor } from "../utils/categories";
import { getToday } from "../utils/date";
import type { Transaction, Category, ImportResult } from "../types";
import type { ColMap } from "../types";
import type { RefObject } from "react";

interface TransactionsViewProps {
  txns: Transaction[];
  cats: Category[];
  catFilter: string | null;
  setCatFilter: (c: string | null) => void;
  presentCats: string[];
  filtered: Transaction[];
  importResult: ImportResult | null;
  onClearImportResult: () => void;
  onTxnsChange: (txns: Transaction[]) => void;
  // CSV import props (for the embedded wizard when txns=0)
  csvStep: "drop" | "map";
  csvHdrs: string[];
  csvRows: Record<string, string>[];
  colMap: ColMap;
  onColMap: (m: ColMap) => void;
  onFile: (f: File | null) => void;
  onImport: () => void;
  onBack: () => void;
  fileRef: RefObject<HTMLInputElement | null>;
  flipSign: boolean;
  onFlipSign: (v: boolean) => void;
}

const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px" };
const PAGE_SIZE = 25;

export function TransactionsView({
  txns, cats, catFilter, setCatFilter, presentCats, filtered,
  importResult, onClearImportResult, onTxnsChange,
  csvStep, csvHdrs, csvRows, colMap, onColMap, onFile, onImport, onBack, fileRef, flipSign, onFlipSign,
}: TransactionsViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string; value: string } | null>(null);
  const [editTxn, setEditTxn] = useState<Transaction | "new" | null>(null);
  const [txnForm, setTxnForm] = useState<TxnFormState>({ date: getToday(), name: "", amount: "", category: "Other", split: 1 });

  // Reset page when filters or search change
  useEffect(() => { setPage(0); }, [catFilter, search]);

  // Global click handler to dismiss menu
  useEffect(() => {
    if (!menuId) return;
    const h = () => setMenuId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [menuId]);

  const catColor = (n: string) => lookupCatColor(cats, n);

  const displayFiltered = (() => {
    let t = [...filtered];
    if (search) t = t.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
    return t;
  })();
  const pageCount = Math.max(1, Math.ceil(displayFiltered.length / PAGE_SIZE));
  const pageTxns = displayFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openAdd = () => {
    setTxnForm({ date: getToday(), name: "", amount: "", category: assignableCats(cats).find(c => c.type === "expense")?.label || "Other", split: 1 });
    setEditTxn("new");
    setMenuId(null);
    setInlineEdit(null);
  };
  const openEdit = (t: Transaction) => {
    setTxnForm({ date: t.date, name: t.name, amount: String(t.amount), category: t.category, split: t.split || 1 });
    setEditTxn(t);
    setMenuId(null);
    setInlineEdit(null);
  };
  const saveTxn = () => {
    const d = {
      date: txnForm.date, name: txnForm.name,
      amount: parseFloat(txnForm.amount) || 0,
      category: txnForm.category,
      split: Math.max(1, parseInt(String(txnForm.split)) || 1),
    };
    if (editTxn === "new") onTxnsChange([{ id: `m${Date.now()}`, account: "", ...d }, ...txns]);
    else onTxnsChange(txns.map(x => x.id === (editTxn as Transaction).id ? { ...x, ...d } : x));
    setEditTxn(null);
  };
  const delTxn = (id: string) => { onTxnsChange(txns.filter(x => x.id !== id)); setMenuId(null); };

  const startInline = (id: string, field: string, value: string | number) => {
    setInlineEdit({ id, field, value: String(value) });
    setEditTxn(null);
  };
  const commitInline = () => {
    if (!inlineEdit) return;
    const { id, field, value } = inlineEdit;
    if (field === "amount") {
      const n = parseFloat(value);
      if (!isNaN(n)) onTxnsChange(txns.map(t => t.id === id ? { ...t, amount: n } : t));
    } else {
      const v = value.trim();
      if (v) onTxnsChange(txns.map(t => t.id === id ? { ...t, [field]: v } : t));
    }
    setInlineEdit(null);
  };
  const commitCat = (id: string, value: string) => {
    onTxnsChange(txns.map(t => t.id === id ? { ...t, category: value } : t));
    setInlineEdit(null);
  };

  const handleExport = () => {
    const csv = buildCsvString(displayFiltered);
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `flowly-${getToday()}.csv`;
    a.click();
  };

  if (txns.length === 0) {
    return (
      <div style={{ ...card, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Import your transactions</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Upload a CSV export from your bank or brokerage to get started.</div>
        </div>
        <ImportWizard step={csvStep} headers={csvHdrs} rows={csvRows} colMap={colMap} onColMap={onColMap} onFile={onFile} onImport={onImport} onBack={onBack} fileRef={fileRef} showCancel={false} flipSign={flipSign} onFlipSign={onFlipSign} />
      </div>
    );
  }

  return (
    <div style={card}>
      {/* Header row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
          Transactions <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>({displayFiltered.length})</span>
        </span>
        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S_IN, width: 140, padding: "5px 9px" }} />
        <button onClick={handleExport} title={`Export ${displayFiltered.length} transactions as CSV`} style={{ ...s_btn("#f1f5f9", "#475569"), display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", fontSize: 11 }}>
          <i className="ti ti-download" style={{ fontSize: 12 }} aria-hidden />Export
        </button>
        <button onClick={openAdd} style={{ ...s_btn("#6366f1"), display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", fontSize: 11 }}>
          <i className="ti ti-plus" style={{ fontSize: 12 }} aria-hidden />Add
        </button>
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid #f1f5f9" }}>
        <Chip label="All" active={!catFilter} onClick={() => setCatFilter(null)} />
        {presentCats.map(cat => (
          <Chip key={cat} label={cat} active={catFilter === cat} color={catColor(cat)} onClick={() => setCatFilter(catFilter === cat ? null : cat)} />
        ))}
      </div>

      {/* Import result banner */}
      {importResult && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#f0fdf4", border: "0.5px solid #bbf7d0", borderRadius: 8, marginBottom: 10, fontSize: 12 }}>
          <span style={{ color: "#166534" }}>
            ✓ <strong>{importResult.added}</strong> transaction{importResult.added !== 1 ? "s" : ""} added
            {importResult.skipped > 0 && <> · <strong>{importResult.skipped}</strong> duplicate{importResult.skipped !== 1 ? "s" : ""} skipped</>}
          </span>
          <button onClick={onClearImportResult} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontSize: 15, lineHeight: 1, padding: "0 0 0 10px" }}>✕</button>
        </div>
      )}

      {/* Edit hint */}
      <div style={{ fontSize: 10, color: "#b0b8c6", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
        <i className="ti ti-pencil" style={{ fontSize: 11 }} aria-hidden />
        Click any <span style={{ ...ED, color: "#b0b8c6", margin: "0 2px" }}>underlined</span> field to edit · Enter or blur to save · Esc to cancel · ⋮ for date, split &amp; delete
      </div>

      {editTxn === "new" && (
        <TxnForm form={txnForm} onChange={setTxnForm} onSave={saveTxn} onCancel={() => setEditTxn(null)} cats={cats} isNew />
      )}

      {/* Column header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 92px 32px", gap: 6, padding: "4px 0 7px", borderBottom: "1px solid #f1f5f9", fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em" }}>
        <span>Name</span><span>Category</span><span style={{ textAlign: "right" }}>Amount</span><span />
      </div>

      {displayFiltered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 13 }}>No transactions match the current filter.</div>
      )}

      {pageTxns.map(t => {
        const eN = inlineEdit?.id === t.id && inlineEdit?.field === "name";
        const eC = inlineEdit?.id === t.id && inlineEdit?.field === "category";
        const eA = inlineEdit?.id === t.id && inlineEdit?.field === "amount";
        return (
          <Fragment key={t.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 92px 32px", gap: 6, padding: "7px 0", borderBottom: "0.5px solid #f8f9fc", alignItems: "center", background: (eN || eC || eA) ? "#fafbff" : "transparent" }}>

              {/* Name cell */}
              <div style={{ minWidth: 0 }}>
                {eN
                  ? <input autoFocus value={inlineEdit!.value}
                      onChange={e => setInlineEdit(v => v ? { ...v, value: e.target.value } : v)}
                      onBlur={commitInline}
                      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setInlineEdit(null); }}
                      style={IE} />
                  : <div onClick={() => startInline(t.id, "name", t.name)} title="Click to edit"
                      style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...ED }}>
                      {t.name}
                    </div>}
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{t.date}</div>
              </div>

              {/* Category cell */}
              {eC
                ? <select autoFocus value={inlineEdit!.value}
                    onChange={e => commitCat(t.id, e.target.value)}
                    onBlur={() => setInlineEdit(null)}
                    style={{ ...IE, color: catColor(inlineEdit!.value), padding: "1px 0", cursor: "pointer" }}>
                    {assignableCats(cats).map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                : <div onClick={() => startInline(t.id, "category", t.category)} title="Click to change category"
                    style={{ fontSize: 11, color: catColor(t.category), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...ED }}>
                    {t.category}
                  </div>}

              {/* Amount cell */}
              <div style={{ textAlign: "right" }}>
                {eA
                  ? <input autoFocus type="number" value={inlineEdit!.value}
                      onChange={e => setInlineEdit(v => v ? { ...v, value: e.target.value } : v)}
                      onBlur={commitInline}
                      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setInlineEdit(null); }}
                      style={{ ...IE, textAlign: "right", color: parseFloat(inlineEdit!.value || "0") >= 0 ? "#10b981" : "#f43f5e" }} />
                  : <div onClick={() => startInline(t.id, "amount", t.amount)} title="Click to edit (original pre-split amount)" style={{ cursor: "text" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: t.amount >= 0 ? "#10b981" : "#f43f5e", ...ED }}>
                        {t.amount >= 0 ? "+" : "-"}{$(Math.abs(eff(t)))}
                      </div>
                      {t.split > 1 && <div style={{ fontSize: 9, color: "#94a3b8" }}>÷{t.split} of {$d(Math.abs(t.amount))}</div>}
                    </div>}
              </div>

              <TxnMenu t={t} menuId={menuId} onToggle={id => setMenuId(menuId === id ? null : id)} onEdit={openEdit} onDelete={delTxn} />
            </div>
            {editTxn !== "new" && (editTxn as Transaction)?.id === t.id && (
              <TxnForm form={txnForm} onChange={setTxnForm} onSave={saveTxn} onCancel={() => setEditTxn(null)} cats={cats} isNew={false} />
            )}
          </Fragment>
        );
      })}

      {displayFiltered.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 12, fontSize: 12 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={s_btn(page === 0 ? "#f1f5f9" : "#6366f1", page === 0 ? "#94a3b8" : "#fff")}>← Prev</button>
          <span style={{ color: "#64748b", fontWeight: 500 }}>Page {page + 1} of {pageCount}</span>
          <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} style={s_btn(page >= pageCount - 1 ? "#f1f5f9" : "#6366f1", page >= pageCount - 1 ? "#94a3b8" : "#fff")}>Next →</button>
        </div>
      )}
      {displayFiltered.length > 0 && (
        <p style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 4 }}>{displayFiltered.length} transactions total</p>
      )}
    </div>
  );
}

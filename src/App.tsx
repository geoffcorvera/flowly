import { useState } from "react";
import { INIT_CATS, PERIODS, NAV } from "./constants";
import { usePersistence } from "./hooks/usePersistence";
import { useCsvImport } from "./hooks/useCsvImport";
import { useComputedData } from "./hooks/useComputedData";
import { Sidebar } from "./components/Sidebar";
import { KpiBar } from "./components/KpiBar";
import { ImportWizard } from "./components/ImportWizard";
import { OverviewView } from "./views/OverviewView";
import { CashflowView } from "./views/CashflowView";
import { TransactionsView } from "./views/TransactionsView";
import { CategoriesView } from "./views/CategoriesView";
import type { Transaction, Category, ImportResult } from "./types";

export default function App() {
  const [txns,         setTxns]         = useState<Transaction[]>([]);
  const [cats,         setCats]         = useState<Category[]>(INIT_CATS);
  const [period,       setPeriod]       = useState("6M");
  const [view,         setView]         = useState("overview");
  const [catFilter,    setCatFilter]    = useState<string | null>(null);
  const [showUpload,   setShowUpload]   = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  usePersistence(txns, cats, setTxns, setCats);

  const csvImport = useCsvImport({
    txns,
    onImport: (newOnes, result) => {
      setTxns(prev => [...prev, ...newOnes].sort((a, b) => b.date.localeCompare(a.date)));
      setImportResult(result);
      setShowUpload(false);
      setView("transactions");
    },
  });

  const { periodTxns, presentCats, filtered, totals, monthlyData, catData, xferCats } =
    useComputedData({ txns, cats, period, catFilter, search: "" });

  const catColor = (n: string) => cats.find(c => c.name === n)?.color ?? "#94a3b8";
  const catTotal = catData.reduce((s, c) => s + c.value, 0);

  const navTo = (v: string) => {
    setView(v);
    setShowUpload(false);
    setCatFilter(null);
    setImportResult(null);
  };

  const triggerImport = () => {
    if (txns.length === 0) {
      setView("transactions");
    } else {
      setShowUpload(true);
    }
  };

  const renderView = () => {
    if (view === "cashflow") {
      return <CashflowView monthlyData={monthlyData} />;
    }

    if (view === "categories") {
      return (
        <CategoriesView
          cats={cats} txns={txns} catData={catData}
          onCatsChange={setCats} onTxnsChange={setTxns}
        />
      );
    }

    if (view === "transactions") {
      return (
        <TransactionsView
          txns={txns} cats={cats}
          catFilter={catFilter} setCatFilter={setCatFilter}
          presentCats={presentCats} filtered={filtered}
          importResult={importResult} onClearImportResult={() => setImportResult(null)}
          onTxnsChange={updated => setTxns(updated.slice().sort((a, b) => b.date.localeCompare(a.date)))}
          csvStep={csvImport.csvStep} csvHdrs={csvImport.csvHdrs}
          csvRows={csvImport.csvRows} colMap={csvImport.colMap}
          onColMap={csvImport.setColMap} onFile={csvImport.handleFile}
          onImport={csvImport.handleImport} onBack={csvImport.handleBack}
          fileRef={csvImport.fileRef}
          flipSign={csvImport.flipSign} onFlipSign={csvImport.setFlipSign}
        />
      );
    }

    // Overview
    if (txns.length === 0) {
      return (
        <div style={{ background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Welcome to Flowly</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Import a bank or brokerage CSV to see your cash flow overview.</div>
          </div>
          <ImportWizard
            step={csvImport.csvStep} headers={csvImport.csvHdrs} rows={csvImport.csvRows}
            colMap={csvImport.colMap} onColMap={csvImport.setColMap}
            onFile={csvImport.handleFile} onImport={csvImport.handleImport}
            onBack={csvImport.handleBack} fileRef={csvImport.fileRef} showCancel={false}
            flipSign={csvImport.flipSign} onFlipSign={csvImport.setFlipSign}
          />
        </div>
      );
    }

    return (
      <OverviewView
        periodTxns={periodTxns} catData={catData} catTotal={catTotal}
        monthlyData={monthlyData} catFilter={catFilter} setCatFilter={setCatFilter}
        xferCats={xferCats} catColor={catColor}
        onNavTo={navTo} onTriggerImport={triggerImport}
      />
    );
  };

  return (
    <div style={{ display: "flex", position: "relative", minHeight: 760, fontFamily: "var(--font-sans)" }}>
      <Sidebar view={view} txnCount={txns.length} onNavTo={navTo} onImport={triggerImport} />

      <div style={{ flex: 1, background: "#f2f4f8", padding: "18px 16px", overflowX: "hidden" }}>
        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{NAV.find(n => n.id === view)?.label}</h1>
            <p style={{ fontSize: 9, color: "#94a3b8", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: ".07em" }}>Portland, OR</p>
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => { setPeriod(p); setCatFilter(null); }}
                style={{ padding: "5px 9px", fontSize: 11, border: "0.5px solid", borderRadius: 6, cursor: "pointer", fontWeight: period === p ? 500 : 400, borderColor: period === p ? "#6366f1" : "#dde1e8", background: period === p ? "#6366f1" : "#fff", color: period === p ? "#fff" : "#94a3b8" }}>
                {p}
              </button>
            ))}
            {txns.length > 0 && (
              <button onClick={triggerImport} style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>
                <i className="ti ti-upload" style={{ fontSize: 12 }} aria-hidden />Import more
              </button>
            )}
          </div>
        </div>

        {/* KPI bar */}
        {txns.length > 0 && <KpiBar totals={totals} period={period} />}

        {renderView()}
      </div>

      {/* Import overlay */}
      {showUpload && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, minHeight: "100%", zIndex: 60, background: "rgba(8,10,15,0.72)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 44 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "24px 26px", width: 490, maxWidth: "90%", border: "0.5px solid #e4e9f0" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Import transactions</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Adds to your existing {txns.length} transaction{txns.length !== 1 ? "s" : ""}. Exact duplicates are skipped automatically.</div>
            </div>
            <ImportWizard
              step={csvImport.csvStep} headers={csvImport.csvHdrs} rows={csvImport.csvRows}
              colMap={csvImport.colMap} onColMap={csvImport.setColMap}
              onFile={csvImport.handleFile} onImport={csvImport.handleImport}
              onBack={csvImport.handleBack}
              onCancel={() => { setShowUpload(false); csvImport.handleBack(); }}
              fileRef={csvImport.fileRef} showCancel
              flipSign={csvImport.flipSign} onFlipSign={csvImport.setFlipSign}
            />
          </div>
        </div>
      )}
    </div>
  );
}

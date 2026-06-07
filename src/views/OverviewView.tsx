import type React from "react";
import { useState } from "react";
import _ from "lodash";
import { CashFlowChart } from "../components/CashFlowChart";
import { ChartLegend } from "../components/ChartLegend";
import { $ } from "../utils/format";
import { eff } from "../utils/transactions";
import type { Transaction, MonthlyDataPoint } from "../types";

interface OverviewViewProps {
  periodTxns: Transaction[];
  catData: { name: string; value: number }[];
  catTotal: number;
  monthlyData: MonthlyDataPoint[];
  catFilter: string | null;
  setCatFilter: (c: string | null) => void;
  xferCats: string[];
  catColor: (n: string) => string;
  onNavTo: (v: string) => void;
  onTriggerImport: () => void;
}

const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px" };

export function OverviewView({ periodTxns, catData, catTotal, monthlyData, catFilter, setCatFilter, xferCats, catColor, onNavTo }: OverviewViewProps) {
  const [recentCat, setRecentCat] = useState("");

  const recentTxns = periodTxns
    .filter(t => t.amount < 0 && !xferCats.includes(t.category) && (recentCat ? t.category === recentCat : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  const spendCatsInPeriod = _.uniq(
    periodTxns.filter(t => t.amount < 0 && !xferCats.includes(t.category)).map(t => t.category)
  ).sort();

  return (
    <>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Cash flow</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Monthly overview</div>
          </div>
          <ChartLegend />
        </div>
        <CashFlowChart data={monthlyData} height={175} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: 12 }}>
        {/* Spending by category */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Spending by category</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{$(catTotal)} total</span>
          </div>
          {catData.slice(0, 6).map(d => {
            const pct = catTotal > 0 ? Math.round(d.value / catTotal * 100) : 0;
            const active = catFilter === d.name;
            return (
              <div key={d.name} style={{ marginBottom: 9, cursor: "pointer" }} onClick={() => setCatFilter(active ? null : d.name)}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: catColor(d.name) }} />
                    <span style={{ color: active ? "var(--color-text-primary)" : "#64748b", fontWeight: active ? 500 : 400 }}>{d.name}</span>
                  </div>
                  <span style={{ fontWeight: 500 }}>{$(d.value)}</span>
                </div>
                <div style={{ height: 3, background: "#f1f5f9", borderRadius: 3 }}>
                  <div style={{ height: 3, width: `${pct}%`, background: catColor(d.name), borderRadius: 3, opacity: catFilter && !active ? 0.3 : 1 }} />
                </div>
              </div>
            );
          })}
          <button onClick={() => onNavTo("categories")} style={{ marginTop: 6, fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Manage categories →</button>
        </div>

        {/* Recent spending */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Recent spending</span>
            <select value={recentCat} onChange={e => setRecentCat(e.target.value)} style={{ fontSize: 11, padding: "3px 7px", borderRadius: 7, border: "0.5px solid #e4e9f0", color: recentCat ? catColor(recentCat) : "#94a3b8", background: "#fff", cursor: "pointer", maxWidth: 120 }}>
              <option value="">All categories</option>
              {spendCatsInPeriod.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {recentTxns.length === 0
            ? <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>No transactions in this category.</p>
            : recentTxns.slice(0, 7).map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "0.5px solid #f8f9fc" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name.slice(0, 26)}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    <span style={{ color: catColor(t.category) }}>●</span> {t.category}
                    {t.split > 1 && <span style={{ marginLeft: 5, color: "#6366f1", fontWeight: 500 }}>÷{t.split}</span>}
                  </div>
                </div>
                <div style={{ flexShrink: 0, paddingLeft: 8, textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#f43f5e" }}>{$(Math.abs(eff(t)))}</div>
                  {t.split > 1 && <div style={{ fontSize: 9, color: "#94a3b8" }}>of {$(Math.abs(t.amount))}</div>}
                </div>
              </div>
            ))}
          <button onClick={() => onNavTo("transactions")} style={{ marginTop: 8, fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0 }}>View all →</button>
        </div>
      </div>
    </>
  );
}

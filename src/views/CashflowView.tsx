import type React from "react";
import { CashFlowChart } from "../components/CashFlowChart";
import { ChartLegend } from "../components/ChartLegend";
import { $ } from "../utils/format";
import type { MonthlyDataPoint } from "../types";

interface CashflowViewProps {
  monthlyData: MonthlyDataPoint[];
}

const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px" };

export function CashflowView({ monthlyData }: CashflowViewProps) {
  return (
    <>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Monthly cash flow</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Each category type shown separately — no double counting</div>
          </div>
          <ChartLegend />
        </div>
        {monthlyData.length === 0
          ? <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No data yet — import transactions to see cash flow.</p>
          : <CashFlowChart data={monthlyData} height={260} />}
      </div>
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Monthly summary</div>
        {monthlyData.length === 0
          ? <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No data yet.</p>
          : (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {["Month", "Income", "Savings", "Invest", "Retire", "Spending", "Net", "Rate"].map(h => (
                    <th key={h} style={{ padding: "5px 0", textAlign: h === "Month" ? "left" : "right", fontWeight: 500, color: "#94a3b8", fontSize: 9, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...monthlyData].reverse().map(d => {
                  const rate = d.income > 0 ? Math.round(((d.savings + d.investments + d.retirement + d.net) / d.income) * 100) : 0;
                  return (
                    <tr key={d.ym} style={{ borderBottom: "0.5px solid #f8f9fc" }}>
                      <td style={{ padding: "7px 0", fontWeight: 500 }}>{d.month} '{d.ym?.slice(2, 4)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: "#10b981" }}>{$(d.income)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: "#06b6d4" }}>{$(d.savings)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: "#a78bfa" }}>{$(d.investments)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: "#f59e0b" }}>{$(d.retirement)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: "#f43f5e" }}>{$(d.spending)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: d.net >= 0 ? "#475569" : "#f43f5e", fontWeight: 500 }}>{$(d.net)}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: rate >= 20 ? "#10b981" : rate >= 10 ? "#f59e0b" : "#f43f5e" }}>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </>
  );
}



import type React from "react";
import { useEffect, useRef, useState } from "react";
import { SankeyDiagram } from "../components/SankeyDiagram";
import { useSankeyData } from "../hooks/useSankeyData";
import type { Transaction, Category } from "../types";

interface FlowChartViewProps {
  periodTxns: Transaction[];
  cats: Category[];
}

const card: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px",
};

export function FlowChartView({ periodTxns, cats }: FlowChartViewProps) {
  const [diagramDims, setDiagramDims] = useState({ width: 600, height: 420 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDiagramDims({ width: w, height: Math.max(300, Math.min(540, w * 0.56)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useSankeyData(cats, periodTxns);

  return (
    <div style={{ ...card }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Cash flow</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          Where money comes from and where it goes — edit the structure in Categories.
        </div>
      </div>

      <div ref={containerRef} style={{ width: "100%" }}>
        {periodTxns.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "60px 0" }}>
            No data yet — import transactions to see your flow chart.
          </p>
        ) : (
          <SankeyDiagram
            data={graphData}
            width={diagramDims.width}
            height={diagramDims.height}
          />
        )}
      </div>
    </div>
  );
}

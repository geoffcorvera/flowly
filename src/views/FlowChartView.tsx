import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SankeyDiagram } from "../components/SankeyDiagram";
import { SankeyConfigurator } from "../components/SankeyConfigurator";
import { useSankeyData } from "../hooks/useSankeyData";
import type { Transaction, Category, SankeyDiagramConfig } from "../types";

interface FlowChartViewProps {
  periodTxns: Transaction[];
  cats: Category[];
  nonExpense: string[];
  sankeyConfig: SankeyDiagramConfig;
  onSankeyConfigChange: (c: SankeyDiagramConfig) => void;
}

const card: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #e4e9f0", borderRadius: 12, padding: "16px 18px",
};

export function FlowChartView({
  periodTxns, cats, nonExpense, sankeyConfig, onSankeyConfigChange,
}: FlowChartViewProps) {
  const [showConfig, setShowConfig] = useState(false);
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

  const graphData = useSankeyData(sankeyConfig, periodTxns, nonExpense);

  // Derive computed values for the configurator display.
  // Leaf node values come from their single incoming link; root values from sum of outgoing links.
  const nodeValues = useMemo(() => {
    const values = new Map<string, number>();
    for (const node of graphData.nodes) values.set(node.nodeConfigId, 0);

    const incomingCount = new Map<string, number>();
    for (const link of graphData.links) {
      const tid = graphData.nodes[link.target]?.nodeConfigId;
      if (tid) {
        values.set(tid, (values.get(tid) ?? 0) + link.value);
        incomingCount.set(tid, (incomingCount.get(tid) ?? 0) + 1);
      }
    }
    for (const node of graphData.nodes) {
      if (!incomingCount.has(node.nodeConfigId)) {
        const outgoing = graphData.links
          .filter(l => graphData.nodes[l.source]?.nodeConfigId === node.nodeConfigId)
          .reduce((s, l) => s + l.value, 0);
        values.set(node.nodeConfigId, outgoing);
      }
    }
    return values;
  }, [graphData]);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* Diagram card */}
      <div style={{ ...card, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Cash flow</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Where money comes from and where it goes</div>
          </div>
          <button
            onClick={() => setShowConfig(s => !s)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 11px", fontSize: 11, fontWeight: 500,
              border: `0.5px solid ${showConfig ? "#6366f1" : "#dde1e8"}`,
              borderRadius: 7, cursor: "pointer",
              background: showConfig ? "#6366f1" : "#fff",
              color: showConfig ? "#fff" : "#6b7280",
            }}
          >
            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 13 }} />
            Configure
          </button>
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

      {/* Configurator panel */}
      {showConfig && (
        <div style={{ ...card, width: 320, flexShrink: 0, maxHeight: "80vh", overflowY: "auto" }}>
          <SankeyConfigurator
            config={sankeyConfig}
            cats={cats}
            computedValues={nodeValues}
            onChange={onSankeyConfigChange}
          />
        </div>
      )}
    </div>
  );
}

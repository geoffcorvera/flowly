import { useState } from "react";
import { Sankey, sankeyLeft } from "@visx/sankey";
import type { SankeyNode, SankeyLink } from "@visx/sankey";
import { $ } from "../utils/format";
import type { SankeyNodeDatum, SankeyGraphData } from "../hooks/useSankeyData";

interface SankeyDiagramProps {
  data: SankeyGraphData;
  width: number;
  height: number;
}

type NodeType = SankeyNode<SankeyNodeDatum, object>;
type LinkType = SankeyLink<SankeyNodeDatum, object>;

const NODE_W = 18;
const NODE_PAD = 12;
const LABEL_W = 140;
const VERT_PAD = 14;

export function SankeyDiagram({ data, width, height }: SankeyDiagramProps) {
  const [hoveredLinkIdx, setHoveredLinkIdx] = useState<number | null>(null);
  const [hoveredNodeIdx, setHoveredNodeIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string[] } | null>(null);

  const innerW = Math.max(width - 2 * LABEL_W, 100);
  const innerH = Math.max(height - 2 * VERT_PAD, 60);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height }}>
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
          No data — add nodes with transaction filters in the configurator.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        width={width}
        height={height}
        style={{ overflow: "visible", display: "block" }}
      >
        <g transform={`translate(${LABEL_W}, ${VERT_PAD})`}>
          <Sankey<SankeyNodeDatum, object>
            root={data as any}
            size={[innerW, innerH]}
            nodeWidth={NODE_W}
            nodePadding={NODE_PAD}
            nodeAlign={sankeyLeft}
          >
            {({ graph, createPath }) => (
              <>
                {/* Links */}
                {graph.links.map((link: LinkType, i: number) => {
                  const src = link.source as NodeType;
                  const color = src.color ?? "#94a3b8";
                  const pathStr = createPath(link as any) ?? "";
                  return (
                    <path
                      key={i}
                      d={pathStr}
                      fill={color}
                      fillOpacity={hoveredLinkIdx === i ? 0.55 : 0.28}
                      stroke="none"
                      style={{ cursor: "default", transition: "fill-opacity .12s" }}
                      onMouseEnter={e => {
                        setHoveredLinkIdx(i);
                        const tgt = link.target as NodeType;
                        setTooltip({
                          x: e.clientX,
                          y: e.clientY,
                          text: [`${src.name} → ${tgt.name}`, $(Math.round(link.value))],
                        });
                      }}
                      onMouseLeave={() => { setHoveredLinkIdx(null); setTooltip(null); }}
                    />
                  );
                })}

                {/* Nodes */}
                {graph.nodes.map((node: NodeType, i: number) => {
                  const x0 = node.x0 ?? 0;
                  const y0 = node.y0 ?? 0;
                  const x1 = node.x1 ?? 0;
                  const y1 = node.y1 ?? 0;
                  const nodeH = Math.max(1, y1 - y0);
                  const midY = y0 + nodeH / 2;
                  const onRight = x0 >= innerW / 2;

                  return (
                    <g
                      key={i}
                      style={{ cursor: "default" }}
                      onMouseEnter={e => {
                        setHoveredNodeIdx(i);
                        setTooltip({
                          x: e.clientX,
                          y: e.clientY,
                          text: [node.name, $(Math.round(node.value ?? 0))],
                        });
                      }}
                      onMouseLeave={() => { setHoveredNodeIdx(null); setTooltip(null); }}
                    >
                      <rect
                        x={x0}
                        y={y0}
                        width={x1 - x0}
                        height={nodeH}
                        fill={node.color ?? "#94a3b8"}
                        rx={3}
                        opacity={hoveredNodeIdx === i ? 1 : 0.88}
                        style={{ transition: "opacity .12s" }}
                      />
                      {nodeH >= 10 && (
                        <>
                          <text
                            x={onRight ? x0 - 8 : x1 + 8}
                            y={midY - 6}
                            textAnchor={onRight ? "end" : "start"}
                            fontSize={11}
                            fontWeight={500}
                            fill="#1f2937"
                            fontFamily="var(--font-sans)"
                          >
                            {node.name}
                          </text>
                          <text
                            x={onRight ? x0 - 8 : x1 + 8}
                            y={midY + 7}
                            textAnchor={onRight ? "end" : "start"}
                            fontSize={10}
                            fill="#6b7280"
                            fontFamily="var(--font-sans)"
                          >
                            {$(Math.round(node.value ?? 0))}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </>
            )}
          </Sankey>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            background: "#1f2937",
            color: "#f9fafb",
            borderRadius: 8,
            padding: "7px 11px",
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,.3)",
          }}
        >
          {tooltip.text.map((line, i) => (
            <div key={i} style={{ fontWeight: i === 0 ? 400 : 600 }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

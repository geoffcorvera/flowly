import { useMemo } from "react";
import { nodeOwnValue } from "../utils/categories";
import type { Transaction, Category } from "../types";

export interface SankeyNodeDatum {
  name: string;
  color: string;
  nodeConfigId: string;
}

export interface SankeyGraphData {
  nodes: SankeyNodeDatum[];
  links: Array<{ source: number; target: number; value: number }>;
}

function buildGraph(cats: Category[], txns: Transaction[]): SankeyGraphData {
  const nodes: SankeyNodeDatum[] = [];
  const links: Array<{ source: number; target: number; value: number }> = [];

  function walk(node: Category, parentIdx: number | null): number {
    const myIdx = nodes.length;
    nodes.push({ name: node.label, color: node.color, nodeConfigId: node.id });

    if (node.subcategories.length === 0) {
      const value = nodeOwnValue(node, txns);
      if (parentIdx !== null && value > 0) {
        links.push({ source: parentIdx, target: myIdx, value });
      }
      return value;
    }

    // Walk children first, collecting their totals.
    const childrenSum = node.subcategories.reduce((s, c) => s + walk(c, myIdx), 0);

    // The node's own value (manual override or its directly-matched transactions);
    // any surplus over the children becomes an unallocated "Other" leaf.
    const ownValue = nodeOwnValue(node, txns);
    const gap = ownValue > 0 ? Math.max(0, ownValue - childrenSum) : 0;
    if (gap > 0) {
      const otherIdx = nodes.length;
      nodes.push({ name: "Other", color: "#94a3b8", nodeConfigId: `${node.id}-other` });
      links.push({ source: myIdx, target: otherIdx, value: gap });
    }

    const totalValue = ownValue > 0 ? Math.max(ownValue, childrenSum) : childrenSum;
    if (parentIdx !== null && totalValue > 0) {
      links.push({ source: parentIdx, target: myIdx, value: totalValue });
    }
    return totalValue;
  }

  for (const root of cats) walk(root, null);

  // Drop nodes that aren't part of any flow (e.g. a standalone "Transfer" root leaf)
  // so @visx/sankey isn't handed disconnected nodes.
  const used = new Set<number>();
  for (const l of links) { used.add(l.source); used.add(l.target); }
  const remap = new Map<number, number>();
  const keptNodes: SankeyNodeDatum[] = [];
  nodes.forEach((n, i) => {
    if (used.has(i)) { remap.set(i, keptNodes.length); keptNodes.push(n); }
  });
  const keptLinks = links.map(l => ({
    source: remap.get(l.source)!,
    target: remap.get(l.target)!,
    value: l.value,
  }));

  return { nodes: keptNodes, links: keptLinks };
}

export function useSankeyData(cats: Category[], periodTxns: Transaction[]): SankeyGraphData {
  return useMemo(() => buildGraph(cats, periodTxns), [cats, periodTxns]);
}

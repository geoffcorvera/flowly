import { useMemo } from "react";
import _ from "lodash";
import { eff } from "../utils/transactions";
import type { Transaction, SankeyDiagramConfig, SankeyNodeConfig, SankeyValueSource } from "../types";

export interface SankeyNodeDatum {
  name: string;
  color: string;
  nodeConfigId: string;
}

export interface SankeyGraphData {
  nodes: SankeyNodeDatum[];
  links: Array<{ source: number; target: number; value: number }>;
}

function computeValue(
  src: SankeyValueSource,
  txns: Transaction[],
  nonExpense: string[],
): number {
  if (src.type === "manual") return src.amount;

  let filtered = txns;
  if (src.spendingOnly) {
    filtered = filtered.filter(t => t.amount < 0 && !nonExpense.includes(t.category));
  } else if (src.categories?.length) {
    const cats = src.categories;
    filtered = filtered.filter(t => cats.includes(t.category));
  }
  if (src.nameContains) {
    const lc = src.nameContains.toLowerCase();
    filtered = filtered.filter(t => t.name.toLowerCase().includes(lc));
  }
  return Math.round(Math.abs(_.sumBy(filtered, eff)));
}

function buildGraph(
  config: SankeyDiagramConfig,
  txns: Transaction[],
  nonExpense: string[],
): SankeyGraphData {
  const nodes: SankeyNodeDatum[] = [];
  const links: Array<{ source: number; target: number; value: number }> = [];

  function walk(node: SankeyNodeConfig, parentIdx: number | null): number {
    const myIdx = nodes.length;
    nodes.push({ name: node.name, color: node.color ?? "#94a3b8", nodeConfigId: node.id });

    if (node.children.length === 0) {
      const value = computeValue(node.valueSource, txns, nonExpense);
      if (parentIdx !== null && value > 0) {
        links.push({ source: parentIdx, target: myIdx, value });
      }
      return value;
    }

    // Walk children first, collecting their values
    const childValues: number[] = [];
    for (const child of node.children) {
      childValues.push(walk(child, myIdx));
    }
    const childrenSum = childValues.reduce((s, v) => s + v, 0);

    // Compute own value to detect unallocated gap
    const ownValue = computeValue(node.valueSource, txns, nonExpense);
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

  for (const root of config.roots) {
    walk(root, null);
  }

  return { nodes, links };
}

export function useSankeyData(
  config: SankeyDiagramConfig,
  periodTxns: Transaction[],
  nonExpense: string[],
): SankeyGraphData {
  return useMemo(
    () => buildGraph(config, periodTxns, nonExpense),
    [config, periodTxns, nonExpense],
  );
}

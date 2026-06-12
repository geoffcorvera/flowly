import _ from "lodash";
import { PALETTE } from "../constants";
import { eff } from "./transactions";
import type { Category, Transaction } from "../types";

/** All nodes of the category tree, depth-first (parents before children). */
export const flattenCats = (cats: Category[]): Category[] =>
  cats.flatMap(c => [c, ...flattenCats(c.subcategories)]);

/** Find a category anywhere in the tree by its label. */
export const findCat = (cats: Category[], label: string): Category | undefined =>
  flattenCats(cats).find(c => c.label === label);

/** Display color for a category label, with a neutral fallback. */
export const catColor = (cats: Category[], label: string): string =>
  findCat(cats, label)?.color ?? "#94a3b8";

/** Categories that a transaction may be assigned to (hidden = structural/aggregator). */
export const assignableCats = (cats: Category[]): Category[] =>
  flattenCats(cats).filter(c => !c.hidden);

/** A category's label plus all of its descendants' labels. */
export const subtreeLabels = (node: Category): string[] =>
  [node.label, ...node.subcategories.flatMap(subtreeLabels)];

/**
 * A category's own value: a manual override if set, else the summed (absolute,
 * split-adjusted) amount of transactions tagged with this category's label.
 */
export const nodeOwnValue = (node: Category, txns: Transaction[]): number => {
  if (node.manualValue != null) return node.manualValue;
  const matched = txns.filter(t => t.category === node.label);
  return Math.round(Math.abs(_.sumBy(matched, eff)));
};

/**
 * A category's total flow as shown in the diagram: leaves use their own value;
 * parents use the larger of their own value and the sum of their children.
 */
export const nodeTotal = (node: Category, txns: Transaction[]): number => {
  if (node.subcategories.length === 0) return nodeOwnValue(node, txns);
  const childrenSum = node.subcategories.reduce((s, c) => s + nodeTotal(c, txns), 0);
  const own = nodeOwnValue(node, txns);
  return own > 0 ? Math.max(own, childrenSum) : childrenSum;
};

/** First palette color not already used by any category, else a deterministic fallback. */
export const nextColor = (cats: Category[]): string => {
  const used = new Set(flattenCats(cats).map(c => c.color.toLowerCase()));
  const free = PALETTE.find(c => !used.has(c.toLowerCase()));
  if (free) return free;
  return PALETTE[used.size % PALETTE.length];
};

import { RULES, HINTS } from "../constants";
import type { Transaction, ColMap } from "../types";

export const eff = (t: Pick<Transaction, "amount" | "split">): number =>
  t.amount / (t.split || 1);

export const txnKey = (t: Pick<Transaction, "date" | "amount" | "name">): string =>
  `${t.date}|${t.amount}|${t.name}`;

export const autoCat = (name: string): string => {
  const u = (name || "").toUpperCase();
  for (const r of RULES) {
    if (r.k.some(k => u.includes(k.toUpperCase()))) return r.c;
  }
  return "Other";
};

export const detectCols = (hdrs: string[]): ColMap => {
  const m: ColMap = { date: "", amount: "", description: "", category: "", account: "" };
  const lc = hdrs.map(h => h.toLowerCase().trim());
  for (const [f, hints] of Object.entries(HINTS)) {
    for (const h of hints) {
      const i = lc.findIndex(l => l === h || l.includes(h));
      if (i >= 0 && !m[f as keyof ColMap]) {
        m[f as keyof ColMap] = hdrs[i];
        break;
      }
    }
  }
  return m;
};

const csvEsc = (v: unknown): string => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const buildCsvString = (txns: Transaction[]): string => {
  const cols = ["Date", "Name", "Category", "Amount", "Effective Amount", "Split", "Account"];
  const rows = txns.map(t => [
    t.date,
    csvEsc(t.name),
    csvEsc(t.category),
    t.amount,
    eff(t).toFixed(2),
    t.split || 1,
    csvEsc(t.account || ""),
  ]);
  return [cols.join(","), ...rows.map(r => r.join(","))].join("\n");
};

import type { Transaction } from "../types";

export const getToday = (): string => new Date().toISOString().slice(0, 10);

export const filterPeriod = (
  txns: Transaction[],
  p: string,
  today = getToday(),
): Transaction[] => {
  if (p === "All") return txns;
  const now = new Date(today);
  if (p === "YTD") {
    const cutoff = `${now.getFullYear()}-01-01`;
    return txns.filter(t => t.date >= cutoff);
  }
  const c = new Date(now);
  if (p === "3M") c.setMonth(c.getMonth() - 3);
  else if (p === "6M") c.setMonth(c.getMonth() - 6);
  else if (p === "1Y") c.setFullYear(c.getFullYear() - 1);
  const cutoff = c.toISOString().slice(0, 10);
  return txns.filter(t => t.date >= cutoff);
};

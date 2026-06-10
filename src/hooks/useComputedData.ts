import { useMemo } from "react";
import _ from "lodash";
import { filterPeriod, getToday } from "../utils/date";
import { eff } from "../utils/transactions";
import { NEEDS_CATS, WANTS_CATS } from "../constants";
import type { Transaction, Category, Totals, MonthlyDataPoint, CustomPeriod } from "../types";

interface ComputedDataInput {
  txns: Transaction[];
  cats: Category[];
  period: string;
  catFilter: string | null;
  search: string;
  customPeriod?: CustomPeriod;
}

interface ComputedData {
  incomeCats: string[];
  savingsCats: string[];
  investCats: string[];
  retireCats: string[];
  xferCats: string[];
  nonExpense: string[];
  periodTxns: Transaction[];
  presentCats: string[];
  filtered: Transaction[];
  totals: Totals;
  monthlyData: MonthlyDataPoint[];
  catData: { name: string; value: number }[];
}

export function useComputedData({
  txns,
  cats,
  period,
  catFilter,
  search,
  customPeriod,
}: ComputedDataInput): ComputedData {
  const incomeCats  = useMemo(() => cats.filter(c => c.type === "income").map(c => c.name), [cats]);
  const savingsCats = useMemo(() => cats.filter(c => c.type === "savings").map(c => c.name), [cats]);
  const investCats  = useMemo(() => cats.filter(c => c.type === "investment").map(c => c.name), [cats]);
  const retireCats  = useMemo(() => cats.filter(c => c.type === "retirement").map(c => c.name), [cats]);
  const xferCats    = useMemo(() => cats.filter(c => c.type === "transfer").map(c => c.name), [cats]);
  const nonExpense  = useMemo(
    () => [...incomeCats, ...savingsCats, ...investCats, ...retireCats, ...xferCats],
    [incomeCats, savingsCats, investCats, retireCats, xferCats],
  );

  const periodTxns = useMemo(() => filterPeriod(txns, period, getToday(), customPeriod), [txns, period, customPeriod]);

  const presentCats = useMemo(() => {
    const s = new Set(periodTxns.map(t => t.category).filter(Boolean));
    if (catFilter) s.add(catFilter);
    return [...s].sort();
  }, [periodTxns, catFilter]);

  const filtered = useMemo(() => {
    let t = [...periodTxns];
    if (catFilter) t = t.filter(x => x.category === catFilter);
    if (search) t = t.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
    return t.sort((a, b) => b.date.localeCompare(a.date));
  }, [periodTxns, catFilter, search]);

  const totals = useMemo((): Totals => {
    const inc = periodTxns.filter(t => incomeCats.includes(t.category)).reduce((s, t) => s + eff(t), 0);
    const sav = Math.abs(periodTxns.filter(t => savingsCats.includes(t.category) && t.amount < 0).reduce((s, t) => s + eff(t), 0));
    const inv = Math.abs(periodTxns.filter(t => investCats.includes(t.category) && t.amount < 0).reduce((s, t) => s + eff(t), 0));
    const ret = Math.abs(periodTxns.filter(t => retireCats.includes(t.category) && t.amount < 0).reduce((s, t) => s + eff(t), 0));
    const sp    = Math.abs(periodTxns.filter(t => t.amount < 0 && !nonExpense.includes(t.category)).reduce((s, t) => s + eff(t), 0));
    const needs = Math.abs(periodTxns.filter(t => t.amount < 0 && (NEEDS_CATS as readonly string[]).includes(t.category)).reduce((s, t) => s + eff(t), 0));
    const wants = Math.abs(periodTxns.filter(t => t.amount < 0 && (WANTS_CATS as readonly string[]).includes(t.category)).reduce((s, t) => s + eff(t), 0));
    return {
      income: Math.round(inc), savings: Math.round(sav), investments: Math.round(inv),
      retirement: Math.round(ret), spending: Math.round(sp), needs: Math.round(needs), wants: Math.round(wants), net: Math.round(inc - sav - inv - ret - sp),
    };
  }, [periodTxns, incomeCats, savingsCats, investCats, retireCats, nonExpense]);

  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    const ms = _.uniq(periodTxns.map(t => t.date.slice(0, 7))).sort();
    return ms.map(m => {
      const mt = periodTxns.filter(t => t.date.startsWith(m));
      const inc = mt.filter(t => incomeCats.includes(t.category)).reduce((s, t) => s + eff(t), 0);
      const sav = Math.abs(mt.filter(t => savingsCats.includes(t.category) && t.amount < 0).reduce((s, t) => s + eff(t), 0));
      const inv = Math.abs(mt.filter(t => investCats.includes(t.category) && t.amount < 0).reduce((s, t) => s + eff(t), 0));
      const ret = Math.abs(mt.filter(t => retireCats.includes(t.category) && t.amount < 0).reduce((s, t) => s + eff(t), 0));
      const sp  = Math.abs(mt.filter(t => t.amount < 0 && !nonExpense.includes(t.category)).reduce((s, t) => s + eff(t), 0));
      const [yr, mo] = m.split("-");
      const label = new Date(+yr, +mo - 1, 1).toLocaleString("en-US", { month: "short" });
      return { month: label, ym: m, income: Math.round(inc), savings: Math.round(sav), investments: Math.round(inv), retirement: Math.round(ret), spending: Math.round(sp), net: Math.round(inc - sav - inv - ret - sp) };
    });
  }, [periodTxns, incomeCats, savingsCats, investCats, retireCats, nonExpense]);

  const catData = useMemo(() => {
    const sp = periodTxns.filter(t => t.amount < 0 && !nonExpense.includes(t.category));
    return Object.entries(_.groupBy(sp, "category"))
      .map(([name, ts]) => ({ name, value: Math.round(Math.abs(_.sumBy(ts, eff))) }))
      .sort((a, b) => b.value - a.value);
  }, [periodTxns, nonExpense]);

  return { incomeCats, savingsCats, investCats, retireCats, xferCats, nonExpense, periodTxns, presentCats, filtered, totals, monthlyData, catData };
}

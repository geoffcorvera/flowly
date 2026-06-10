import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useComputedData } from "./useComputedData";
import { INIT_CATS } from "../constants";
import type { Transaction } from "../types";

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: "1", date: "2026-03-01", name: "Test", amount: -10, category: "Other", split: 1, account: "", ...overrides,
});

const baseInput = { cats: INIT_CATS, period: "All", catFilter: null, search: "" };

describe("useComputedData — totals", () => {
  it("sums income correctly", () => {
    const txns = [tx({ amount: 5000, category: "Income" })];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.income).toBe(5000);
  });

  it("spending excludes savings, investment, retirement, and transfers", () => {
    const txns = [
      tx({ amount: -100, category: "Food & Drink" }),
      tx({ amount: -500, category: "Savings" }),
      tx({ amount: -1000, category: "Investment" }),
      tx({ amount: -200, category: "Retirement" }),
      tx({ amount: -50, category: "Transfer" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.spending).toBe(100);
    expect(result.current.totals.savings).toBe(500);
    expect(result.current.totals.investments).toBe(1000);
    expect(result.current.totals.retirement).toBe(200);
  });

  it("net = income - savings - investments - retirement - spending", () => {
    const txns = [
      tx({ amount: 3000, category: "Income" }),
      tx({ amount: -500, category: "Savings" }),
      tx({ amount: -300, category: "Food & Drink" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.net).toBe(3000 - 500 - 300);
  });

  it("accounts for split in totals", () => {
    const txns = [tx({ amount: -200, split: 2, category: "Food & Drink" })];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.spending).toBe(100);
  });

  it("needs sums Utilities + Groceries + Pets + Onyx + Health only", () => {
    const txns = [
      tx({ amount: -100, category: "Utilities" }),
      tx({ amount: -200, category: "Groceries" }),
      tx({ amount: -50,  category: "Pets" }),
      tx({ amount: -75,  category: "Health" }),
      tx({ amount: -100, category: "Food & Drink" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.needs).toBe(425);
  });

  it("wants sums Entertainment + Shopping + Food & Drink only", () => {
    const txns = [
      tx({ amount: -100, category: "Entertainment" }),
      tx({ amount: -200, category: "Shopping" }),
      tx({ amount: -50,  category: "Food & Drink" }),
      tx({ amount: -75,  category: "Utilities" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.wants).toBe(350);
  });

  it("needs respects split", () => {
    const txns = [tx({ amount: -200, split: 2, category: "Groceries" })];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    expect(result.current.totals.needs).toBe(100);
  });
});

describe("useComputedData — catData", () => {
  it("excludes income and transfer from catData", () => {
    const txns = [
      tx({ amount: -50, category: "Food & Drink" }),
      tx({ amount: 3000, category: "Income" }),
      tx({ amount: -100, category: "Transfer" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    const names = result.current.catData.map(d => d.name);
    expect(names).not.toContain("Income");
    expect(names).not.toContain("Transfer");
    expect(names).toContain("Food & Drink");
  });

  it("excludes savings from catData (spending chart only shows true expenses)", () => {
    const txns = [
      tx({ amount: -50, category: "Groceries" }),
      tx({ amount: -500, category: "Savings" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    const names = result.current.catData.map(d => d.name);
    expect(names).not.toContain("Savings");
  });

  it("sorts catData descending by value", () => {
    const txns = [
      tx({ amount: -10, category: "Health" }),
      tx({ amount: -200, category: "Shopping" }),
      tx({ amount: -50, category: "Food & Drink" }),
    ];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    const values = result.current.catData.map(d => d.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });
});

describe("useComputedData — filtered", () => {
  it("filters by catFilter", () => {
    const txns = [tx({ category: "Groceries" }), tx({ id: "2", category: "Health" })];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput, catFilter: "Groceries" }));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].category).toBe("Groceries");
  });

  it("filters by search (case-insensitive)", () => {
    const txns = [tx({ name: "Starbucks" }), tx({ id: "2", name: "Safeway" })];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput, search: "star" }));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Starbucks");
  });

  it("sorts filtered descending by date", () => {
    const txns = [tx({ id: "a", date: "2026-01-01" }), tx({ id: "b", date: "2026-03-01" }), tx({ id: "c", date: "2026-02-01" })];
    const { result } = renderHook(() => useComputedData({ txns, ...baseInput }));
    const dates = result.current.filtered.map(t => t.date);
    expect(dates).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });
});

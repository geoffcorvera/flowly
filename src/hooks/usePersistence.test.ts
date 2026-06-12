import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistence } from "./usePersistence";
import { DEFAULT_CATEGORIES } from "../constants";
import type { Transaction, Category } from "../types";

const TX: Transaction = { id: "1", date: "2026-01-01", name: "Test", amount: -10, category: "Other", split: 1, account: "" };
const CAT: Category = { id: "c99", label: "Custom", color: "#ff0000", type: "expense", subcategories: [] };

beforeEach(() => localStorage.clear());

describe("usePersistence", () => {
  it("loads txns and cats from localStorage on mount", () => {
    localStorage.setItem("fw9", JSON.stringify({ txns: [TX], cats: [CAT] }));
    const setTxns = vi.fn();
    const setCats = vi.fn();
    renderHook(() => usePersistence([], DEFAULT_CATEGORIES, setTxns, setCats));
    expect(setTxns).toHaveBeenCalledWith([TX]);
    expect(setCats).toHaveBeenCalledWith([CAT]);
  });

  it("migrates transactions from the legacy fw8 key and seeds default categories", () => {
    localStorage.setItem("fw8", JSON.stringify({ txns: [TX], cats: [], sankeyConfig: {} }));
    const setTxns = vi.fn();
    const setCats = vi.fn();
    renderHook(() => usePersistence([], DEFAULT_CATEGORIES, setTxns, setCats));
    expect(setTxns).toHaveBeenCalledWith([TX]);
    expect(setCats).toHaveBeenCalledWith(DEFAULT_CATEGORIES);
  });

  it("does not call setTxns when storage is empty", () => {
    const setTxns = vi.fn();
    const setCats = vi.fn();
    renderHook(() => usePersistence([], DEFAULT_CATEGORIES, setTxns, setCats));
    expect(setTxns).not.toHaveBeenCalled();
  });

  it("saves to localStorage after loaded=true, even with empty txns (category changes persist)", () => {
    const setTxns = vi.fn();
    const setCats = vi.fn();
    const { rerender } = renderHook(
      ({ cats }) => usePersistence([], cats, setTxns, setCats),
      { initialProps: { cats: DEFAULT_CATEGORIES } },
    );
    act(() => rerender({ cats: [...DEFAULT_CATEGORIES, CAT] }));
    const saved = JSON.parse(localStorage.getItem("fw9") || "{}");
    expect(saved.cats).toContainEqual(CAT);
    expect(saved.txns).toEqual([]);
  });

  it("saves txns when they change", () => {
    const setTxns = vi.fn();
    const setCats = vi.fn();
    const { rerender } = renderHook(
      ({ txns }) => usePersistence(txns, DEFAULT_CATEGORIES, setTxns, setCats),
      { initialProps: { txns: [] as Transaction[] } },
    );
    act(() => rerender({ txns: [TX] }));
    const saved = JSON.parse(localStorage.getItem("fw9") || "{}");
    expect(saved.txns).toContainEqual(TX);
  });

  it("returns loaded=true after mount", () => {
    const { result } = renderHook(() => usePersistence([], DEFAULT_CATEGORIES, vi.fn(), vi.fn()));
    expect(result.current.loaded).toBe(true);
  });
});

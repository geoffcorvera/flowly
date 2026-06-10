import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistence } from "./usePersistence";
import { INIT_CATS, DEFAULT_SANKEY_CONFIG } from "../constants";
import type { Transaction, Category } from "../types";

const TX: Transaction = { id: "1", date: "2026-01-01", name: "Test", amount: -10, category: "Other", split: 1, account: "" };
const CAT: Category = { id: "c99", name: "Custom", color: "#ff0000", type: "expense" };

const hook = (overrides?: Partial<Parameters<typeof usePersistence>>) => {
  const defaults: Parameters<typeof usePersistence> = [[], INIT_CATS, DEFAULT_SANKEY_CONFIG, vi.fn(), vi.fn(), vi.fn()];
  return (overrides ? Object.assign(defaults, overrides) : defaults) as Parameters<typeof usePersistence>;
};

beforeEach(() => localStorage.clear());

describe("usePersistence", () => {
  it("loads txns and cats from localStorage on mount", () => {
    localStorage.setItem("fw8", JSON.stringify({ txns: [TX], cats: [CAT] }));
    const setTxns = vi.fn();
    const setCats = vi.fn();
    const setSankeyConfig = vi.fn();
    renderHook(() => usePersistence([], INIT_CATS, DEFAULT_SANKEY_CONFIG, setTxns, setCats, setSankeyConfig));
    expect(setTxns).toHaveBeenCalledWith([TX]);
    expect(setCats).toHaveBeenCalledWith([CAT]);
  });

  it("does not call setTxns when storage is empty", () => {
    const setTxns = vi.fn();
    const setCats = vi.fn();
    renderHook(() => usePersistence([], INIT_CATS, DEFAULT_SANKEY_CONFIG, setTxns, setCats, vi.fn()));
    expect(setTxns).not.toHaveBeenCalled();
  });

  it("saves to localStorage after loaded=true, even with empty txns (category changes persist)", () => {
    const setTxns = vi.fn();
    const setCats = vi.fn();
    const { rerender } = renderHook(
      ({ cats }) => usePersistence([], cats, DEFAULT_SANKEY_CONFIG, setTxns, setCats, vi.fn()),
      { initialProps: { cats: INIT_CATS } },
    );
    act(() => rerender({ cats: [...INIT_CATS, CAT] }));
    const saved = JSON.parse(localStorage.getItem("fw8") || "{}");
    expect(saved.cats).toContainEqual(CAT);
    expect(saved.txns).toEqual([]);
  });

  it("saves txns when they change", () => {
    const setTxns = vi.fn();
    const setCats = vi.fn();
    const { rerender } = renderHook(
      ({ txns }) => usePersistence(txns, INIT_CATS, DEFAULT_SANKEY_CONFIG, setTxns, setCats, vi.fn()),
      { initialProps: { txns: [] as Transaction[] } },
    );
    act(() => rerender({ txns: [TX] }));
    const saved = JSON.parse(localStorage.getItem("fw8") || "{}");
    expect(saved.txns).toContainEqual(TX);
  });

  it("returns loaded=true after mount", () => {
    const { result } = renderHook(() => usePersistence([], INIT_CATS, DEFAULT_SANKEY_CONFIG, vi.fn(), vi.fn(), vi.fn()));
    expect(result.current.loaded).toBe(true);
  });
});

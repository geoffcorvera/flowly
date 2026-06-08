import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCsvImport } from "./useCsvImport";

vi.mock("papaparse", () => ({
  default: {
    parse: (_file: File, opts: { complete: (r: { data: unknown[]; meta: { fields: string[] } }) => void }) => {
      opts.complete({
        data: [{ Date: "2026-01-01", Amount: "50.00", Desc: "Coffee" }],
        meta: { fields: ["Date", "Amount", "Desc"] },
      });
    },
  },
}));

const colMap = { date: "Date", amount: "Amount", description: "Desc", category: "", account: "" };

describe("useCsvImport — flipSign", () => {
  it("flipSign defaults to false", () => {
    const { result } = renderHook(() => useCsvImport({ txns: [], onImport: vi.fn() }));
    expect(result.current.flipSign).toBe(false);
  });

  it("imports positive amount unchanged when flipSign=false", () => {
    const onImport = vi.fn();
    const { result } = renderHook(() => useCsvImport({ txns: [], onImport }));
    act(() => { result.current.handleFile(new File([""], "test.csv")); });
    act(() => { result.current.setColMap(colMap); });
    act(() => { result.current.handleImport(); });
    expect(onImport.mock.calls[0][0][0].amount).toBe(50);
  });

  it("negates amount when flipSign=true", () => {
    const onImport = vi.fn();
    const { result } = renderHook(() => useCsvImport({ txns: [], onImport }));
    act(() => { result.current.handleFile(new File([""], "test.csv")); });
    act(() => { result.current.setColMap(colMap); });
    act(() => { result.current.setFlipSign(true); });
    act(() => { result.current.handleImport(); });
    expect(onImport.mock.calls[0][0][0].amount).toBe(-50);
  });

  it("resets flipSign to false after handleBack", () => {
    const { result } = renderHook(() => useCsvImport({ txns: [], onImport: vi.fn() }));
    act(() => { result.current.setFlipSign(true); });
    act(() => { result.current.handleBack(); });
    expect(result.current.flipSign).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { filterPeriod } from "./date";
import type { Transaction } from "../types";

const tx = (date: string, amount = -10): Transaction => ({
  id: date, date, name: "Test", amount, category: "Other", split: 1, account: "",
});

describe("filterPeriod", () => {
  const today = "2026-06-07";

  it("All returns everything", () => {
    const txns = [tx("2020-01-01"), tx("2026-06-07")];
    expect(filterPeriod(txns, "All", today)).toHaveLength(2);
  });

  it("3M excludes transactions older than 3 months", () => {
    const txns = [tx("2025-12-01"), tx("2026-04-01"), tx("2026-06-01")];
    const result = filterPeriod(txns, "3M", today);
    expect(result.map(t => t.date)).toEqual(["2026-04-01", "2026-06-01"]);
  });

  it("6M excludes transactions older than 6 months", () => {
    const txns = [tx("2025-11-01"), tx("2025-12-15"), tx("2026-06-01")];
    const result = filterPeriod(txns, "6M", today);
    expect(result.map(t => t.date)).toEqual(["2025-12-15", "2026-06-01"]);
  });

  it("YTD includes only current year", () => {
    const txns = [tx("2025-12-31"), tx("2026-01-01"), tx("2026-06-07")];
    const result = filterPeriod(txns, "YTD", today);
    expect(result.map(t => t.date)).toEqual(["2026-01-01", "2026-06-07"]);
  });

  it("1Y excludes transactions older than 1 year", () => {
    const txns = [tx("2025-06-06"), tx("2025-06-08"), tx("2026-01-01")];
    const result = filterPeriod(txns, "1Y", today);
    expect(result.map(t => t.date)).toEqual(["2025-06-08", "2026-01-01"]);
  });

  it("includes transaction on the cutoff date boundary", () => {
    const txns = [tx("2026-03-07"), tx("2026-03-06")];
    const result = filterPeriod(txns, "3M", today);
    expect(result.map(t => t.date)).toContain("2026-03-07");
  });

  it("returns empty array when no transactions match", () => {
    const txns = [tx("2020-01-01")];
    expect(filterPeriod(txns, "1Y", today)).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { parseDate } from "./parseDate";

describe("parseDate", () => {
  it("passes through an already-ISO date unchanged", () => {
    expect(parseDate("2026-06-06")).toBe("2026-06-06");
  });
  it("converts MM/DD/YYYY (Chase / BofA format)", () => {
    expect(parseDate("06/06/2026")).toBe("2026-06-06");
  });
  it("converts M/D/YYYY (single-digit month and day)", () => {
    expect(parseDate("1/5/2026")).toBe("2026-01-05");
  });
  it("converts MM/DD/YY (2-digit year → 20xx)", () => {
    expect(parseDate("06/06/26")).toBe("2026-06-06");
  });
  it("converts MM-DD-YYYY (dash-separated US format)", () => {
    expect(parseDate("06-06-2026")).toBe("2026-06-06");
  });
  it("returns the raw string when format is unrecognizable", () => {
    expect(parseDate("not-a-date")).toBe("not-a-date");
  });
  it("trims surrounding whitespace before parsing", () => {
    expect(parseDate("  06/06/2026  ")).toBe("2026-06-06");
  });
  it("converts dates with month names", () => {
    expect(parseDate("Jun 6, 2026")).toBe("2026-06-06");
  });
});

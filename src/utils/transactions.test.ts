import { describe, it, expect } from "vitest";
import { autoCat, detectCols, txnKey, eff, buildCsvString } from "./transactions";
import type { Transaction } from "../types";

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "1", date: "2026-01-01", name: "Test", amount: -25, category: "Other",
  split: 1, account: "", ...overrides,
});

describe("autoCat", () => {
  it("matches Starbucks to Food & Drink", () => expect(autoCat("STARBUCKS #1234")).toBe("Food & Drink"));
  it("matches Safeway to Groceries", () => expect(autoCat("SAFEWAY STORE")).toBe("Groceries"));
  it("matches Fidelity to Investment", () => expect(autoCat("FIDELITY TRANSFER")).toBe("Investment"));
  it("matches 401K to Retirement", () => expect(autoCat("401K CONTRIBUTION")).toBe("Retirement"));
  it("matches PAYROLL to Income", () => expect(autoCat("PAYROLL DIRECT DEP")).toBe("Income"));
  it("is case-insensitive", () => expect(autoCat("starbucks latte")).toBe("Food & Drink"));
  it("falls back to Other for unknown", () => expect(autoCat("RANDOM XYZ CO")).toBe("Other"));
  it("handles empty string", () => expect(autoCat("")).toBe("Other"));
  it("categorizes AIRBNB as Entertainment", () => expect(autoCat("AIRBNB PAYMENT")).toBe("Entertainment"));
  it("categorizes HOTEL as Entertainment", () => expect(autoCat("MARRIOTT HOTEL STAY")).toBe("Entertainment"));
  it("categorizes VRBO as Entertainment", () => expect(autoCat("VRBO* RESERVATION")).toBe("Entertainment"));
});

describe("detectCols", () => {
  it("detects date column by exact match", () => {
    expect(detectCols(["Date", "Amount", "Description"]).date).toBe("Date");
  });
  it("detects amount column", () => {
    expect(detectCols(["Date", "Amount", "Description"]).amount).toBe("Amount");
  });
  it("detects description by partial match", () => {
    expect(detectCols(["Transaction Date", "Transaction Amount", "Description"]).description).toBe("Description");
  });
  it("returns empty string for unmatched fields", () => {
    expect(detectCols(["Foo", "Bar"]).date).toBe("");
  });
  it("handles Chase-style headers", () => {
    const m = detectCols(["Transaction Date", "Post Date", "Description", "Category", "Type", "Amount", "Memo"]);
    expect(m.date).toBeTruthy();
    expect(m.amount).toBeTruthy();
    expect(m.description).toBeTruthy();
  });
});

describe("txnKey", () => {
  it("produces a stable key", () => {
    expect(txnKey(tx())).toBe("2026-01-01|-25|Test");
  });
  it("differs when name differs", () => {
    expect(txnKey(tx({ name: "A" }))).not.toBe(txnKey(tx({ name: "B" })));
  });
});

describe("eff", () => {
  it("returns amount when split is 1", () => expect(eff(tx())).toBe(-25));
  it("divides by split", () => expect(eff(tx({ amount: -100, split: 4 }))).toBe(-25));
  it("treats split 0 as 1 to avoid Infinity", () => expect(eff(tx({ amount: -50, split: 0 }))).toBe(-50));
});

describe("buildCsvString", () => {
  it("produces a header row", () => {
    const csv = buildCsvString([]);
    expect(csv.startsWith("Date,Name,Category")).toBe(true);
  });

  it("escapes category names containing commas", () => {
    const csv = buildCsvString([tx({ category: "Food, Drink" })]);
    expect(csv).toContain('"Food, Drink"');
    // naive split gives 8 because the quoted comma is still a character;
    // the toContain above verifies the field is correctly quoted
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
  });

  it("escapes double quotes in name", () => {
    const csv = buildCsvString([tx({ name: 'Say "hello"' })]);
    expect(csv).toContain('"Say ""hello"""');
  });

  it("includes effective amount for split transactions", () => {
    const csv = buildCsvString([tx({ amount: -100, split: 4 })]);
    expect(csv).toContain("-25.00");
  });
});

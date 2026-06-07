import { describe, it, expect } from "vitest";
import { $, $d } from "./format";

describe("$", () => {
  it("formats zero", () => expect($( 0)).toBe("$0"));
  it("formats positive integer", () => expect($(1234)).toBe("$1,234"));
  it("formats negative", () => expect($(-500)).toBe("-$500"));
  it("rounds to integer", () => expect($(12.75)).toBe("$13"));
  it("handles undefined-ish null via || 0", () => expect($(NaN)).toBe("$0"));
});

describe("$d", () => {
  it("shows two decimals", () => expect($d(12.5)).toBe("$12.50"));
  it("formats zero as $0.00", () => expect($d(0)).toBe("$0.00"));
  it("handles negative", () => expect($d(-9.99)).toBe("-$9.99"));
});

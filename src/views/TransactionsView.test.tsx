import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionsView } from "./TransactionsView";
import { DEFAULT_CATEGORIES } from "../constants";
import { INIT_COLS } from "../hooks/useCsvImport.constants";
import { createRef } from "react";
import type { Transaction } from "../types";

const fileRef = createRef<HTMLInputElement>();

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "1", date: "2026-01-15", name: "Starbucks", amount: -5, category: "Food & Drink", split: 1, account: "", ...overrides,
});

const baseProps = {
  cats: DEFAULT_CATEGORIES,
  catFilter: null,
  setCatFilter: vi.fn(),
  presentCats: ["Food & Drink"],
  importResult: null,
  onClearImportResult: vi.fn(),
  csvStep: "drop" as const,
  csvHdrs: [],
  csvRows: [],
  colMap: INIT_COLS,
  onColMap: vi.fn(),
  onFile: vi.fn(),
  onImport: vi.fn(),
  onBack: vi.fn(),
  fileRef,
};

describe("TransactionsView — empty state", () => {
  it("shows import wizard when txns is empty", () => {
    render(<TransactionsView {...baseProps} txns={[]} filtered={[]} onTxnsChange={vi.fn()} />);
    expect(screen.getByText(/drop your csv here/i)).toBeInTheDocument();
  });
});

describe("TransactionsView — with transactions", () => {
  let onTxnsChange: ReturnType<typeof vi.fn>;
  const txns = [tx(), tx({ id: "2", name: "Safeway", category: "Groceries", amount: -45 })];

  beforeEach(() => { onTxnsChange = vi.fn(); });

  it("renders transaction names", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
    expect(screen.getByText("Starbucks")).toBeInTheDocument();
    expect(screen.getByText("Safeway")).toBeInTheDocument();
  });

  it("shows Add button and search input", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("shows import result banner when importResult is set", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} importResult={{ added: 3, skipped: 1 }} />);
    // "3" and "1" are in <strong> elements; use a function matcher to check the
    // parent span's full textContent which concatenates all child text nodes
    const bannerSpan = screen.getByText((_, el) =>
      el?.tagName === "SPAN" && /transactions added/.test(el.textContent ?? "")
    );
    expect(bannerSpan.textContent).toMatch(/3/);
    expect(bannerSpan.textContent).toMatch(/1 duplicate/);
  });

  it("calls onClearImportResult when banner is dismissed", () => {
    const onClear = vi.fn();
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} importResult={{ added: 2, skipped: 0 }} onClearImportResult={onClear} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("inline edit: clicking name shows input", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
    fireEvent.click(screen.getByText("Starbucks"));
    expect(screen.getByDisplayValue("Starbucks")).toBeInTheDocument();
  });

  it("inline edit: Escape cancels without saving", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
    fireEvent.click(screen.getByText("Starbucks"));
    const input = screen.getByDisplayValue("Starbucks");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByText("Starbucks")).toBeInTheDocument();
    expect(onTxnsChange).not.toHaveBeenCalled();
  });

  it("inline edit: blur commits the value", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
    fireEvent.click(screen.getByText("Starbucks"));
    const input = screen.getByDisplayValue("Starbucks");
    fireEvent.change(input, { target: { value: "Peet's Coffee" } });
    fireEvent.blur(input);
    expect(onTxnsChange).toHaveBeenCalledOnce();
    const updated = onTxnsChange.mock.calls[0][0] as Transaction[];
    expect(updated.find(t => t.id === "1")?.name).toBe("Peet's Coffee");
  });

  it("shows no-match message when filtered is empty", () => {
    render(<TransactionsView {...baseProps} txns={txns} filtered={[]} onTxnsChange={onTxnsChange} />);
    expect(screen.getByText(/no transactions match/i)).toBeInTheDocument();
  });

  describe("inline amount edit", () => {
    it("saves a valid numeric value on blur", () => {
      render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
      fireEvent.click(screen.getAllByTitle("Click to edit (original pre-split amount)")[0]);
      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "-12.50" } });
      fireEvent.blur(input);
      expect(onTxnsChange).toHaveBeenCalledOnce();
      const updated = onTxnsChange.mock.calls[0][0] as Transaction[];
      expect(updated.find(t => t.id === "1")?.amount).toBe(-12.5);
    });

    it("discards non-numeric input without overwriting the original value", () => {
      render(<TransactionsView {...baseProps} txns={txns} filtered={txns} onTxnsChange={onTxnsChange} />);
      fireEvent.click(screen.getAllByTitle("Click to edit (original pre-split amount)")[0]);
      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "abc" } });
      fireEvent.blur(input);
      expect(onTxnsChange).not.toHaveBeenCalled();
    });
  });
});

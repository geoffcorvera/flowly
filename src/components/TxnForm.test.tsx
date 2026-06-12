import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TxnForm } from "./TxnForm";
import { DEFAULT_CATEGORIES } from "../constants";
import type { TxnFormState } from "./TxnForm";

const blank: TxnFormState = { date: "", name: "", amount: "", category: "Other", split: 1 };
const valid: TxnFormState = { date: "2026-01-01", name: "Coffee", amount: "-5", category: "Food & Drink", split: 1 };

describe("TxnForm", () => {
  it("shows 'Add' button when isNew=true", () => {
    render(<TxnForm form={valid} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("shows 'Save' button when isNew=false", () => {
    render(<TxnForm form={valid} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew={false} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("disables save when name is empty", () => {
    render(<TxnForm form={{ ...valid, name: "" }} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("disables save when amount is empty", () => {
    render(<TxnForm form={{ ...valid, amount: "" }} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("disables save when date is empty", () => {
    render(<TxnForm form={{ ...valid, date: "" }} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("enables save when all required fields filled", () => {
    render(<TxnForm form={valid} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("shows split share preview when split > 1", () => {
    render(<TxnForm form={{ ...valid, amount: "-100", split: 4 }} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    expect(screen.getByText(/\$25\.00 your share/)).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<TxnForm form={blank} onChange={vi.fn()} onSave={vi.fn()} onCancel={onCancel} cats={DEFAULT_CATEGORIES} isNew />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onSave when Add is clicked and form is valid", () => {
    const onSave = vi.fn();
    render(<TxnForm form={valid} onChange={vi.fn()} onSave={onSave} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("omits hidden (structural) categories from the dropdown", () => {
    render(<TxnForm form={valid} onChange={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} cats={DEFAULT_CATEGORIES} isNew />);
    const opts = screen.getAllByRole("option").map(o => o.textContent);
    expect(opts).toContain("Food & Drink");
    expect(opts).not.toContain("Spending"); // hidden aggregator
    expect(opts).not.toContain("Needs");
    expect(opts).not.toContain("Wants");
  });
});

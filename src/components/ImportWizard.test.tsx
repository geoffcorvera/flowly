import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImportWizard } from "./ImportWizard";
import { INIT_COLS } from "../hooks/useCsvImport.constants";
import { createRef } from "react";

const fileRef = createRef<HTMLInputElement>();

describe("ImportWizard — drop step", () => {
  it("shows upload prompt on step=drop", () => {
    render(<ImportWizard step="drop" headers={[]} rows={[]} colMap={INIT_COLS} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={vi.fn()} fileRef={fileRef} showCancel={false} />);
    expect(screen.getByText(/drop your csv here/i)).toBeInTheDocument();
  });

  it("shows cancel button when showCancel=true", () => {
    render(<ImportWizard step="drop" headers={[]} rows={[]} colMap={INIT_COLS} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={vi.fn()} onCancel={vi.fn()} fileRef={fileRef} showCancel />);
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("hides cancel button when showCancel=false", () => {
    render(<ImportWizard step="drop" headers={[]} rows={[]} colMap={INIT_COLS} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={vi.fn()} fileRef={fileRef} showCancel={false} />);
    expect(screen.queryByText("✕")).not.toBeInTheDocument();
  });
});

describe("ImportWizard — map step", () => {
  const headers = ["Date", "Amount", "Description"];
  const colMap = { ...INIT_COLS, date: "Date", amount: "Amount", description: "Description" };

  it("shows column count", () => {
    render(<ImportWizard step="map" headers={headers} rows={[]} colMap={colMap} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={vi.fn()} fileRef={fileRef} showCancel={false} />);
    expect(screen.getByText(/3 columns detected/)).toBeInTheDocument();
  });

  it("Import button is enabled when required columns are mapped", () => {
    render(<ImportWizard step="map" headers={headers} rows={[]} colMap={colMap} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={vi.fn()} fileRef={fileRef} showCancel={false} />);
    expect(screen.getByRole("button", { name: /import/i })).toBeEnabled();
  });

  it("Import button is disabled when required columns are missing", () => {
    render(<ImportWizard step="map" headers={headers} rows={[]} colMap={INIT_COLS} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={vi.fn()} fileRef={fileRef} showCancel={false} />);
    expect(screen.getByRole("button", { name: /import/i })).toBeDisabled();
  });

  it("Back button calls onBack", () => {
    const onBack = vi.fn();
    render(<ImportWizard step="map" headers={headers} rows={[]} colMap={colMap} onColMap={vi.fn()} onFile={vi.fn()} onImport={vi.fn()} onBack={onBack} fileRef={fileRef} showCancel={false} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

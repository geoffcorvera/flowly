import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoriesView } from "./CategoriesView";
import type { Category } from "../types";

const leaf = (id: string, label: string, color = "#aaa"): Category => ({
  id, label, color, type: "expense", subcategories: [],
});

const cats: Category[] = [
  { id: "root", label: "Spending", color: "#f43f5e", type: "expense", subcategories: [leaf("food", "Food")] },
];

const baseProps = {
  cats,
  txns: [],
  catData: [],
  onCatsChange: vi.fn(),
  onTxnsChange: vi.fn(),
};

describe("CategoriesView — edit buttons", () => {
  it("renders an Edit button for each category card", () => {
    render(<CategoriesView {...baseProps} />);
    const editBtns = screen.getAllByTitle("Edit");
    expect(editBtns.length).toBe(2); // Spending + Food
  });

  it("edit button container is visible (opacity 1) when hovering the card", () => {
    render(<CategoriesView {...baseProps} />);

    const [editBtn] = screen.getAllByTitle("Edit");
    const btnContainer = editBtn.parentElement!;

    // Before hover: opacity should be < 1 (dimmed state)
    expect(btnContainer.style.opacity).toBe("0.35");

    // Hover the card (parent of the button container)
    const card = btnContainer.parentElement!;
    fireEvent.mouseEnter(card);

    // After hover: opacity must be 1 so the icons are fully visible
    expect(btnContainer.style.opacity).toBe("1");
  });

  it("edit button container returns to dimmed state after mouse leave", () => {
    render(<CategoriesView {...baseProps} />);
    const [editBtn] = screen.getAllByTitle("Edit");
    const card = editBtn.parentElement!.parentElement!;

    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);

    expect(editBtn.parentElement!.style.opacity).toBe("0.35");
  });
});

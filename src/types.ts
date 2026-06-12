export interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  category: string;
  split: number;
  account: string;
}

export type CategoryType =
  | "expense" | "savings" | "investment" | "retirement" | "income" | "transfer";

export interface Category {
  id: string;
  label: string;
  color: string;
  type: CategoryType;
  /** When true, this category is structural/aggregating and cannot be assigned to a transaction. */
  hidden?: boolean;
  /** When set, overrides the value computed from matching transactions. */
  manualValue?: number;
  subcategories: Category[];
}

export interface ColMap {
  date: string;
  amount: string;
  description: string;
  category: string;
  account: string;
}

export interface Totals {
  income: number;
  savings: number;
  investments: number;
  retirement: number;
  spending: number;
  needs: number;
  wants: number;
  net: number;
}

export interface MonthlyDataPoint {
  month: string;
  ym: string;
  income: number;
  savings: number;
  investments: number;
  retirement: number;
  spending: number;
  net: number;
}

export interface ImportResult {
  added: number;
  skipped: number;
}

export interface CustomPeriod {
  from: string;
  to: string;
}

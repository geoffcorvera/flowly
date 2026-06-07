export interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  category: string;
  split: number;
  account: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: "expense" | "savings" | "investment" | "retirement" | "income" | "transfer";
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

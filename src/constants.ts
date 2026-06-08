import type React from "react";
import type { Category } from "./types";

// ── Default categories ────────────────────────────────────────────────────────
export const INIT_CATS: Category[] = [
  { id: "c1",  name: "Food & Drink",  color: "#f97316", type: "expense" },
  { id: "c2",  name: "Groceries",     color: "#22c55e", type: "expense" },
  { id: "c3",  name: "Transport",     color: "#3b82f6", type: "expense" },
  { id: "c4",  name: "Entertainment", color: "#a855f7", type: "expense" },
  { id: "c5",  name: "Shopping",      color: "#ec4899", type: "expense" },
  { id: "c6",  name: "Health",        color: "#14b8a6", type: "expense" },
  { id: "c7",  name: "Utilities",     color: "#eab308", type: "expense" },
  { id: "c8",  name: "Subscriptions", color: "#6366f1", type: "expense" },
  { id: "c9",  name: "Savings",       color: "#06b6d4", type: "savings" },
  { id: "c10", name: "Investment",    color: "#a78bfa", type: "investment" },
  { id: "c11", name: "Retirement",    color: "#f59e0b", type: "retirement" },
  { id: "c12", name: "Income",        color: "#10b981", type: "income" },
  { id: "c13", name: "Transfer",      color: "#6b7280", type: "transfer" },
  { id: "c14", name: "Other",         color: "#94a3b8", type: "expense" },
  { id: "c15", name: "Pets",          color: "#98aa56", type: "expense" },
  { id: "c16", name: "Onyx",          color: "#000000", type: "expense" },
];

export const TYPE_LABELS: Record<string, string> = {
  expense:    "Expense",
  savings:    "Savings account",
  investment: "Investment / Brokerage",
  retirement: "Retirement (401k / IRA / pension)",
  income:     "Income",
  transfer:   "Transfer (excluded from totals)",
};

// ── Auto-categorize rules ─────────────────────────────────────────────────────
export const RULES: { c: string; k: string[] }[] = [
  { c: "Retirement",   k: ["401K","IRA","ROTH","HSA","PENSION","RETIREMENT CONTRIB","TIAA","VOYA"] },
  { c: "Savings",      k: ["SAVINGS TRANSFER","HIGH YIELD","ALLY BANK","HOUSE MAINTENANCE", "HOUSE FUND"] },
  { c: "Investment",   k: ["FIDELITY","SCHWAB","VANGUARD","ETRADE","ROBINHOOD","BROKERAGE","AMERITRADE","BETTERMENT"] },
  { c: "Food & Drink", k: ["FOOD","BREWING","COFFEE","CAFE","RESTAURANT","PIZZA","BAR","TAVERN","SQ *","STARBUCKS","DOORDASH","GRUBHUB","TACO","KITCHEN","GRILL","DUTCH BROS","BAKERY","TAPROOM","DONUT","DOUGHNUT","PHO","RAMEN","SANDWICH","SUBWAY","CHICKEN","WAFFLE","JUICE","SMOOTHIE","BAHN MI","BAGEL","CURRY","ICE CREAM","GELATO","POPEYES", "TAP HOUSE","PAYDIRT","BASILISK","BBQ"] },
  { c: "Groceries",    k: ["SAFEWAY","KROGER","WHOLE FOODS","TRADER JOE","FRED MEYER","WINCO","GROCERY","NEW SEASONS","NATURAL GROCERS","H-MART"] },
  { c: "Transport",    k: ["LYFT","UBER","PARKING","SHELL","CHEVRON","ARCO","GAS","TRIMET","TRANSIT"] },
  { c: "Entertainment",k: ["TICKETMASTER","CINEMA","THEATER","AMC","TOMO","GYM","MOVEMENT","CIRCUIT GYM","FUTSAL"] },
  { c: "Shopping",     k: ["AMAZON","TARGET","WALMART","COSTCO","EBAY","ETSY","NIKE","REI","NEXT ADVENTURE","MUJI","CYCLES","BOOKS"] },
  { c: "Health",       k: ["PHARMACY","CVS","WALGREENS","GYM","FITNESS","YOGA","PLANET FITNESS","DENTAL","MEDICAL","PROVIDENCE","KAISER","COMMON GROUND WELLNES"] },
  { c: "Utilities",    k: ["ELECTRIC","INTERNET","COMCAST","XFINITY","PGE","AT&T","VERIZON","T-MOBILE","ELECTRICITY","WATER","GAS BILL","NW NATURAL"] },
  { c: "Income",       k: ["PAYROLL","DIRECT DEPOSIT","SALARY","WAGES","DEPOSIT","REWARDS","INTEREST"] },
  { c: "Transfer",     k: ["TRANSFER","ZELLE","VENMO","PAYPAL","CASH APP","ACH"] },
  { c: "Subscriptions", k: ["SUBSCRIPTION","MEMBERSHIP","MONTHLY FEE","ANNUAL FEE","RENEWAL","NYTIMES","NETFLIX","SPOTIFY","HULU","DISNEY","HBO","APPLE.COM/BILL","OPENAI","RIDE WITH GPS"] },
  { c: "Pets",         k: ["PETCO","PETSMART","VET","ANIMAL HOSPITAL", "MUD BAY", "GREEN DOG"] },
  { c: "Onyx",         k: ["Childcare", "Child care"] },
];

// ── Column detection hints ─────────────────────────────────────────────────────
export const HINTS: Record<string, string[]> = {
  date:        ["date", "transaction date", "posted", "trans date"],
  amount:      ["amount", "transaction amount", "debit/credit", "value"],
  description: ["description", "name", "merchant", "payee", "narrative", "memo"],
  category:    ["category", "type", "label"],
  account:     ["account", "account name"],
};

// ── Navigation ─────────────────────────────────────────────────────────────────
export const PERIODS = ["3M", "6M", "YTD", "1Y", "All"] as const;

export const NAV = [
  { id: "overview",     icon: "ti-layout-dashboard", label: "Overview" },
  { id: "cashflow",     icon: "ti-arrows-exchange",  label: "Cash flow" },
  { id: "transactions", icon: "ti-list",             label: "Transactions" },
  { id: "categories",  icon: "ti-tags",             label: "Categories" },
] as const;

// ── Shared style objects ──────────────────────────────────────────────────────
export const S_IN: React.CSSProperties = {
  fontSize: 12, padding: "7px 9px", borderRadius: 8,
  border: "0.5px solid #e4e9f0", background: "#fff", color: "#111827",
  outline: "none", width: "100%", boxSizing: "border-box",
};

export const s_btn = (bg: string, col = "#fff"): React.CSSProperties => ({
  padding: "7px 14px", fontSize: 12, fontWeight: 500,
  border: "none", borderRadius: 8, cursor: "pointer", background: bg, color: col,
});

// Inline edit input — borderless, just an underline accent
export const IE: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, width: "100%", border: "none",
  borderBottom: "1.5px solid #6366f1", outline: "none", background: "transparent",
  color: "#111827", padding: "1px 2px", boxSizing: "border-box", fontFamily: "inherit",
};

// Editable field display hint
export const ED: React.CSSProperties = {
  cursor: "text", textDecoration: "underline",
  textDecorationStyle: "dotted", textDecorationColor: "#d1d5db",
};


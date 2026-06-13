import type React from "react";
import type { Category } from "./types";

const leaf = (id: string, label: string, color: string, type: Category["type"] = "expense"): Category =>
  ({ id, label, color, type, subcategories: [] });

// ── Default category tree ─────────────────────────────────────────────────────
// One source of truth: drives both the Categories graph and the Sankey diagram.
// `hidden` nodes are structural aggregators (not assignable to transactions); their
// value is the sum of their children. Every label that transactions are tagged with
// appears here so existing data keeps matching.
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "income", label: "Income", color: "#10b981", type: "income",
    subcategories: [
      leaf("benefits",   "Benefits",   "#73a869"),
      leaf("retirement", "Retirement", "#f59e0b", "retirement"),
      leaf("savings",    "Savings",    "#06b6d4", "savings"),
      leaf("investment", "Investment", "#a78bfa", "investment"),
      {
        id: "spending", label: "Spending", color: "#f43f5e", type: "expense", hidden: true,
        subcategories: [
          {
            id: "needs", label: "Needs", color: "#fb923c", type: "expense", hidden: true,
            subcategories: [
              leaf("utilities", "Utilities", "#eab308"),
              leaf("groceries", "Groceries", "#22c55e"),
              leaf("pets",      "Pets",      "#98aa56"),
              leaf("onyx",      "Onyx",      "#0ea5e9"),
              leaf("health",    "Health",    "#14b8a6"),
              leaf("bills",     "Bills",     "#9c16b6"),
              leaf("debt",      "Debt",      "#9d2424"),
            ],
          },
          {
            id: "wants", label: "Wants", color: "#f472b6", type: "expense", hidden: true,
            subcategories: [
              leaf("entertainment", "Entertainment", "#a855f7"),
              leaf("shopping",      "Shopping",      "#ec4899"),
              leaf("food",          "Food & Drink",  "#f97316"),
              leaf("transport",     "Transport",     "#3b82f6"),
              leaf("subscriptions", "Subscriptions", "#6366f1"),
            ],
          },
          leaf("other", "Other", "#94a3b8"),
        ],
      },
    ],
  },
  leaf("transfer", "Transfer", "#6b7280", "transfer"),
];

// Auto-color palette for new categories (used by nextColor in utils/categories).
export const PALETTE: string[] = [
  "#6366f1", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6",
  "#eab308", "#06b6d4", "#a78bfa", "#f59e0b", "#10b981", "#f43f5e", "#0ea5e9",
  "#84cc16", "#d946ef", "#fb923c", "#2dd4bf", "#e11d48", "#7c3aed",
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
  { c: "Entertainment",k: ["TICKETMASTER","CINEMA","THEATER","AMC","TOMO","GYM","MOVEMENT","CIRCUIT GYM","FUTSAL","AIRBNB","HOTEL","HOSTEL","VRBO","EXPEDIA","BOOKING","KAYAK"] },
  { c: "Shopping",     k: ["AMAZON","TARGET","WALMART","COSTCO","EBAY","ETSY","NIKE","REI","NEXT ADVENTURE","MUJI","CYCLES","BOOKS"] },
  { c: "Health",       k: ["PHARMACY","CVS","WALGREENS","GYM","FITNESS","YOGA","PLANET FITNESS","DENTAL","MEDICAL","PROVIDENCE","KAISER","COMMON GROUND WELLNES"] },
  { c: "Utilities",    k: ["ELECTRIC","INTERNET","COMCAST","XFINITY","PGE","AT&T","VERIZON","T-MOBILE","ELECTRICITY","WATER","GAS BILL","NW NATURAL"] },
  { c: "Income",       k: ["PAYROLL","DIRECT DEPOSIT","SALARY","WAGES","DEPOSIT","REWARDS","INTEREST"] },
  { c: "Transfer",     k: ["TRANSFER","ZELLE","VENMO","PAYPAL","CASH APP","ACH"] },
  { c: "Subscriptions", k: ["SUBSCRIPTION","MEMBERSHIP","MONTHLY FEE","ANNUAL FEE","RENEWAL","NYTIMES","NETFLIX","SPOTIFY","HULU","DISNEY","HBO","APPLE.COM/BILL","OPENAI","RIDE WITH GPS"] },
  { c: "Pets",         k: ["PETCO","PETSMART","VET","ANIMAL HOSPITAL", "MUD BAY", "MUDBAY", "GREEN DOG"] },
  { c: "Onyx",         k: ["Childcare", "Child care", "DIAPER"] },
  { c: "Bills",        k: ["INSURANCE","DROPBOX"] },
  { c: "Debt",         k: ["DEPT EDUCATION", "MORTGAGE"] },
];

// ── Spending sub-totals ───────────────────────────────────────────────────────
export const NEEDS_CATS = ["Utilities", "Groceries", "Pets", "Onyx", "Health", "Bills", "Debt"] as const;
export const WANTS_CATS = ["Entertainment", "Shopping", "Food & Drink", "Subscriptions"] as const;

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
  { id: "flowchart",    icon: "ti-hierarchy-2",      label: "Flow Chart" },
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



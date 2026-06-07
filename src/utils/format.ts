export const fmt = (n: number, maxFrac = 0): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: maxFrac,
  }).format(n || 0);

/** Integer-rounded dollar, e.g. $1,234 */
export const $ = (n: number): string => fmt(n, 0);

/** Two-decimal dollar, e.g. $12.50 */
export const $d = (n: number): string => fmt(n, 2);

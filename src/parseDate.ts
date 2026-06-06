export const parseDate = (s: string): string => {
  const t = s.trim();
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // MM/DD/YYYY or M/D/YYYY (Chase, BofA, Wells Fargo)
  const slash4 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash4) return `${slash4[3]}-${slash4[1].padStart(2,"0")}-${slash4[2].padStart(2,"0")}`;
  // MM/DD/YY → 20xx
  const slash2 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slash2) return `20${slash2[3]}-${slash2[1].padStart(2,"0")}-${slash2[2].padStart(2,"0")}`;
  // MM-DD-YYYY
  const dash = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) return `${dash[3]}-${dash[1].padStart(2,"0")}-${dash[2].padStart(2,"0")}`;
  // Fallback: let Date parse it and re-serialize (handles "Jan 15, 2024" etc.)
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return t;
};

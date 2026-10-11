export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$",
  ZAR: "R", NGN: "₦", KES: "KSh", JPY: "¥", SGD: "S$",
};

export function money(amount: number | null | undefined, currency = "USD"): string {
  const n = Number(amount ?? 0);
  const sym = CURRENCY_SYMBOLS[currency] ?? "$";
  const fixed = Math.abs(n).toFixed(2);
  const [whole, dec] = fixed.split(".");
  const withSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${sym}${withSep}.${dec}`;
}

export function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number, from?: string): string {
  const base = from ? new Date(from + "T00:00:00Z") : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function isOverdue(status: string, dueDate: string | null): boolean {
  if (status !== "unpaid" || !dueDate) return false;
  return dueDate < todayISO();
}

/**
 * The status a person should see: overdue beats partial beats unpaid.
 * Pass amountPaid to get "partial" for invoices with some money received.
 */
export function displayStatus(status: string, dueDate: string | null, amountPaid?: number | null): string {
  if (isOverdue(status, dueDate)) return "overdue";
  if (status === "unpaid" && Number(amountPaid || 0) > 0) return "partial";
  return status;
}

/** What is still owed on an invoice (never negative). */
export function balanceDue(inv: { total: number | string; amount_paid?: number | string | null; status?: string }): number {
  if (inv.status === "paid") return 0;
  return round2(Math.max(0, Number(inv.total || 0) - Number(inv.amount_paid || 0)));
}

/** Adds n weeks/months/quarters/years to a YYYY-MM-DD date. Month-end safe (31 Jan + 1 month = 28/29 Feb). */
export function addInterval(dateISO: string, recurring: string, times = 1): string {
  const [y, m, d] = dateISO.slice(0, 10).split("-").map((x) => parseInt(x, 10));
  if (recurring === "weekly") {
    const dt = new Date(Date.UTC(y, m - 1, d + 7 * times));
    return dt.toISOString().slice(0, 10);
  }
  const months = recurring === "monthly" ? 1 : recurring === "quarterly" ? 3 : 12;
  const target = new Date(Date.UTC(y, m - 1 + months * times, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10) + "T00:00:00Z") - Date.parse(a.slice(0, 10) + "T00:00:00Z")) / 86400000);
}

/**
 * A user's payment link, with {amount}, {invoice} and {currency} filled in.
 * e.g. "https://paypal.me/studio/{amount}" -> "https://paypal.me/studio/1500.00"
 */
export function fillPaymentLink(link: string | null | undefined, amount: number, invoiceNumber: string, currency: string): string | null {
  const raw = (link || "").trim();
  if (!/^https:\/\/[^\s]+$/i.test(raw)) return null;
  return raw
    .replace(/\{amount\}/gi, Number(amount || 0).toFixed(2))
    .replace(/\{invoice\}/gi, encodeURIComponent(invoiceNumber))
    .replace(/\{currency\}/gi, encodeURIComponent(currency));
}

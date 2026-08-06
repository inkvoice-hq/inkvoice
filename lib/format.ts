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

export function displayStatus(status: string, dueDate: string | null): string {
  return isOverdue(status, dueDate) ? "overdue" : status;
}

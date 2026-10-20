// lib/reconcile.ts
// -----------------------------------------------------------------------------
// Matching statement lines to open invoices. Plain, explainable rules (no AI):
// every suggestion comes with the reasons it scored, and anything that isn't
// a clear match is left for the user to confirm.
//
//   invoice number in the reference/description   +55 (number) / +35 (digits)
//   amount equals the balance (same currency)        +35   (total: +30, net: +30)
//   up to 5% short (likely a transfer fee)           +25   (bigger shortfall: +8, part-payment)
//   rands that fit the invoice at its exchange rate  +25 within 3%, +15 within 8%, +5 within 15%
//   payer name looks like the client                 +20 (email domain: +15)
//   paid before the invoice existed                  −25
//
//   ≥ 70 high confidence (pre-ticked) · 40–69 check · < 40 no suggestion
// -----------------------------------------------------------------------------
import { round2 } from "@/lib/format";
import type { StatementLine } from "@/lib/statements";

export type OpenInvoice = {
  id: string; number: string; issue_date: string | null;
  currency: string; total: number; balance: number; fx_rate: number | null;
  client_id: string | null; client_name: string; client_contact: string; client_email: string;
  disputed: boolean;
};

export type Candidate = { invoiceId: string; score: number; reasons: string[] };
export type Confidence = "high" | "check" | "none";

const STOP = new Set(["ltd", "llc", "inc", "pty", "the", "and", "co", "company", "corp", "limited", "gmbh", "bv", "sa", "studio", "media", "group", "services", "payment", "payments", "from", "received", "money", "transfer", "with", "reference", "invoice"]);

function tokens(s: string): string[] {
  return (s || "").toLowerCase().replace(/[^a-z0-9@. ]+/g, " ").split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
}

const close = (a: number, b: number, pct = 0.005) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * pct);

/** Up to 5% short: almost always a bank/intermediary fee, not a real underpayment. */
export const SHORT_TOLERANCE = 0.05;
const isSlightlyShort = (paid: number, due: number) => paid < due && paid >= due * (1 - SHORT_TOLERANCE);

export function scoreMatch(line: StatementLine, inv: OpenInvoice, home: string): Candidate {
  let score = 0;
  const reasons: string[] = [];
  const hay = (line.text + " " + line.reference).toUpperCase().replace(/\s+/g, "");
  const num = inv.number.toUpperCase().replace(/\s+/g, "");
  const digits = (inv.number.match(/(\d{3,})\s*$/) || [])[1];

  if (num.length >= 3 && hay.includes(num)) { score += 55; reasons.push(`Reference mentions ${inv.number}`); }
  else if (digits && new RegExp("(^|\\D)0*" + digits + "(\\D|$)").test(line.text + " " + line.reference)) {
    score += 35; reasons.push(`Reference contains ${digits}`);
  }

  if (line.currency === inv.currency) {
    if (close(line.gross, inv.balance)) { score += 35; reasons.push("Amount equals the balance due"); }
    else if (close(line.gross, inv.total)) { score += 30; reasons.push("Amount equals the invoice total"); }
    else if (close(line.net, inv.balance)) { score += 30; reasons.push("Amount after fees equals the balance"); }
    else if (isSlightlyShort(line.gross, inv.balance)) {
      score += 25; reasons.push(`Slightly short (${round2(inv.balance - line.gross)} less), probably a transfer fee`);
    }
    else if (line.gross < inv.balance) { score += 8; reasons.push("Could be a part-payment"); }
    else if (line.gross > inv.balance * 1.02) { score -= 10; }
  } else if (line.currency === home && inv.currency !== home && Number(inv.fx_rate) > 0) {
    const expected = inv.balance * Number(inv.fx_rate);
    const diff = Math.abs(line.gross - expected) / expected;
    if (diff <= 0.03) { score += 25; reasons.push(`${home} amount fits at the invoice's exchange rate`); }
    else if (diff <= 0.08) { score += 15; reasons.push(`${home} amount is close after exchange and fees`); }
    else if (diff <= 0.15) { score += 5; reasons.push(`${home} amount is roughly right after exchange`); }
  }

  const payerTokens = new Set(tokens(line.text));
  const clientTokens = tokens(inv.client_name + " " + inv.client_contact);
  const hit = clientTokens.find((t) => payerTokens.has(t));
  // "BRIGHTSIDE" should still match "Bright Side, Inc."
  const squash = (x: string) => x.toLowerCase().replace(/\b(ltd|llc|inc|pty|co|corp|limited|gmbh)\b/g, "").replace(/[^a-z0-9]/g, "");
  const compactClient = squash(inv.client_name);
  const compactText = squash(line.text);
  if (hit || (compactClient.length >= 5 && compactText.includes(compactClient))) {
    score += 20; reasons.push(`Payer looks like ${inv.client_name}`);
  }
  else if (inv.client_email) {
    const domain = (inv.client_email.split("@")[1] || "").split(".")[0];
    if (domain && domain.length >= 3 && !["gmail", "yahoo", "outlook", "hotmail", "icloud"].includes(domain) && payerTokens.has(domain)) {
      score += 15; reasons.push(`Mentions ${domain}`);
    }
  }

  if (line.date && inv.issue_date && line.date < inv.issue_date) { score -= 25; reasons.push("Paid before the invoice date"); }
  if (inv.disputed) reasons.push("Invoice is marked disputed");
  return { invoiceId: inv.id, score: Math.max(0, Math.min(100, score)), reasons };
}

export function confidence(score: number): Confidence {
  return score >= 70 ? "high" : score >= 40 ? "check" : "none";
}

/** Top candidates per line, then one invoice per line (best scores first). */
export function suggest(lines: StatementLine[], invoices: OpenInvoice[], home: string) {
  const all = lines.map((l) => ({
    line: l,
    cands: invoices.map((inv) => scoreMatch(l, inv, home)).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 4),
  }));
  const taken = new Set<string>();
  const pairs = all.flatMap((a) => a.cands.map((c) => ({ key: a.line.key, c })))
    .sort((x, y) => y.c.score - x.c.score);
  const pick = new Map<string, Candidate>();
  for (const p of pairs) {
    if (pick.has(p.key) || taken.has(p.c.invoiceId) || confidence(p.c.score) === "none") continue;
    pick.set(p.key, p.c); taken.add(p.c.invoiceId);
  }
  return all.map((a) => ({ line: a.line, candidates: a.cands, chosen: pick.get(a.line.key) ?? null }));
}

export type Allocation = {
  amount: number;      // credited to the invoice, in the invoice currency
  fee: number;         // in the account currency
  home: number;        // landed, in the account currency
  estimated: boolean;  // true when the rands are an estimate (money still in a USD balance)
  note: string | null;
};

/**
 * How much of a statement line to credit to an invoice, and what it was worth
 * in the account currency. `crossRate(a, b)` converts between two currencies
 * when the line is in neither the invoice's nor the account's currency.
 */
export function allocate(line: StatementLine, inv: OpenInvoice, home: string, crossRate?: (from: string, to: string) => number | null): Allocation {
  const r = Number(inv.fx_rate) > 0 ? Number(inv.fx_rate) : 1;

  if (line.currency === inv.currency) {
    // Slightly short: credit the full balance and treat the gap as a fee, so
    // reminders don't chase the client for a bank charge.
    const short = !close(line.gross, inv.balance) && isSlightlyShort(line.gross, inv.balance)
      ? round2(inv.balance - line.gross) : 0;
    const amount = short ? round2(inv.balance) : round2(Math.min(line.gross, inv.balance));
    const fees = line.fee + short; // in the line currency
    const note = short
      ? `${short} ${inv.currency} short, recorded as a fee and marked paid. Lower the credit if the client really underpaid.`
      : line.gross > inv.balance + 0.01 ? `Paid ${round2(line.gross - inv.balance)} more than the balance` : null;
    if (inv.currency === home) return { amount, fee: round2(fees), home: round2(line.net), estimated: false, note };
    if (line.home !== null) return { amount, fee: round2(fees * (line.home / Math.max(line.net, 0.01))), home: round2(line.home), estimated: false, note };
    return { amount, fee: round2(fees * r), home: round2(line.net * r), estimated: true,
      note: note ?? `${home} amount estimated at the invoice rate until you convert` };
  }

  if (line.currency === home) {
    // Money landed in the bank already converted (e.g. FNB global payment).
    const expected = inv.balance * r;
    const amount = Math.abs(line.gross - expected) / expected <= 0.15
      ? inv.balance
      : round2(Math.min(inv.balance, line.gross / r));
    return { amount, fee: round2(line.fee), home: round2(line.net), estimated: false,
      note: amount === inv.balance ? null : "Looks like a part-payment" };
  }

  const toInv = crossRate?.(line.currency, inv.currency) ?? null;
  const toHome = crossRate?.(line.currency, home) ?? null;
  return {
    amount: round2(Math.min(inv.balance, toInv ? line.gross * toInv : 0)),
    fee: round2(toHome ? line.fee * toHome : 0),
    home: round2(toHome ? line.net * toHome : 0),
    estimated: true,
    note: `Paid in ${line.currency}; converted at today's rate, please check`,
  };
}

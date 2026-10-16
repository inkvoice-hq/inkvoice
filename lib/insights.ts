// lib/insights.ts
// -----------------------------------------------------------------------------
// Pure, explainable maths behind Insights, Follow-ups and smarter reminders.
// No database access here: callers pass rows in, so it is easy to test and the
// same rules are used everywhere.
//
//   clientProfiles  — how each client actually pays (average days late)
//   forecast        — expected cash in the next 30/60/90 days, in home currency
//   fxSummary       — fees and exchange-rate gains/losses on foreign payments
//   nextStep        — the recommended collection action for one invoice
// -----------------------------------------------------------------------------
import { addInterval, balanceDue, daysBetween, round2, toHome } from "@/lib/format";

export type InvoiceRow = {
  id: string; number: string; client_id: string | null; status: string;
  issue_date: string | null; due_date: string | null; paid_date: string | null;
  total: number; amount_paid: number; currency: string | null; fx_rate: number | null;
  recurring: string | null; recur_next_date: string | null;
  viewed_at: string | null; reminders_sent: number; sent_at: string | null;
  last_reminder_at?: string | null;
};
export type PaymentRow = {
  invoice_id: string; amount: number; home_amount: number | null; fee: number; paid_on: string;
};

export type ProfileLabel = "new" | "reliable" | "a little late" | "slow";
export type ClientProfile = { paidCount: number; avgDaysLate: number; label: ProfileLabel; summary: string };

/** How a client has paid in the past, from invoices with both a due date and a paid date. */
export function clientProfiles(invoices: InvoiceRow[]): Map<string, ClientProfile> {
  const late = new Map<string, number[]>();
  for (const i of invoices) {
    if (i.status !== "paid" || !i.client_id || !i.due_date || !i.paid_date) continue;
    const arr = late.get(i.client_id) ?? [];
    arr.push(daysBetween(i.due_date, i.paid_date));
    late.set(i.client_id, arr);
  }
  const out = new Map<string, ClientProfile>();
  for (const [id, arr] of late) {
    const avg = Math.round(arr.reduce((s, d) => s + d, 0) / arr.length);
    const label: ProfileLabel = avg <= 2 ? "reliable" : avg <= 10 ? "a little late" : "slow";
    const summary = label === "reliable" ? "Usually pays on time" : `Usually pays ${avg} days late`;
    out.set(id, { paidCount: arr.length, avgDaysLate: avg, label, summary: summary + ` (${arr.length} paid)` });
  }
  return out;
}

export function profileFor(profiles: Map<string, ClientProfile>, clientId: string | null): ClientProfile {
  return (clientId && profiles.get(clientId)) || { paidCount: 0, avgDaysLate: 0, label: "new", summary: "No payment history yet" };
}

// ---------------------------------------------------------------------------
export type ForecastRow = {
  date: string; ref: string; invoiceId: string | null; clientId: string | null;
  home: number; amount: number; currency: string; kind: "open" | "overdue" | "recurring"; basis: string;
};
export type Forecast = {
  overdue: { amount: number; count: number };
  buckets: { label: string; from: number; to: number; amount: number; count: number }[];
  rows: ForecastRow[];
};

export function forecast(invoices: InvoiceRow[], homeCur: string, today: string, horizon = 90): Forecast {
  const profiles = clientProfiles(invoices);
  const rows: ForecastRow[] = [];
  const end = addInterval(today, "weekly", Math.ceil(horizon / 7));

  for (const i of invoices) {
    if (i.status === "draft" || i.status === "paid") continue;
    const bal = balanceDue(i);
    if (bal <= 0 || !i.due_date) continue;
    const p = profileFor(profiles, i.client_id);
    const shift = Math.max(0, p.avgDaysLate);
    const expected = addDays(i.due_date, shift);
    const cur = i.currency || homeCur;
    if (i.due_date < today) {
      rows.push({ date: today, ref: i.number, invoiceId: i.id, clientId: i.client_id, home: toHome(bal, i.fx_rate), amount: bal, currency: cur, kind: "overdue",
        basis: `Overdue since ${i.due_date}` });
    } else {
      rows.push({ date: expected > today ? expected : today, ref: i.number, invoiceId: i.id, clientId: i.client_id, home: toHome(bal, i.fx_rate), amount: bal, currency: cur, kind: "open",
        basis: shift > 0 ? `Due ${i.due_date}; ${p.summary.toLowerCase()}` : `Due ${i.due_date}` });
    }
  }

  // Future copies of recurring invoices that haven't been created yet.
  for (const t of invoices) {
    if (!t.recurring || !t.recur_next_date || !t.issue_date || !["unpaid", "paid"].includes(t.status)) continue;
    const p = profileFor(profiles, t.client_id);
    const term = t.due_date ? Math.max(0, daysBetween(t.issue_date, t.due_date)) : 30;
    const cur = t.currency || homeCur;
    let k = 0, occ = t.recur_next_date;
    // walk the schedule anchored on the original issue date (no month-end drift)
    while (k < 1000 && addInterval(t.issue_date, t.recurring, k) < t.recur_next_date) k++;
    for (; k < 1000; k++) {
      occ = addInterval(t.issue_date, t.recurring, k);
      const payDate = addDays(occ, term + Math.max(0, p.avgDaysLate));
      if (payDate > end) break;
      if (payDate < today) continue;
      rows.push({ date: payDate, ref: `${t.number} (next ${t.recurring} copy, ${occ})`, invoiceId: null, clientId: t.client_id,
        home: toHome(t.total, t.fx_rate), amount: Number(t.total), currency: cur, kind: "recurring",
        basis: `Recurring ${t.recurring}; invoice on ${occ}, due ${addDays(occ, term)}` });
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  const buckets = [
    { label: "Next 30 days", from: 0, to: 30, amount: 0, count: 0 },
    { label: "31–60 days", from: 31, to: 60, amount: 0, count: 0 },
    { label: "61–90 days", from: 61, to: 90, amount: 0, count: 0 },
  ];
  const overdue = { amount: 0, count: 0 };
  for (const r of rows) {
    if (r.kind === "overdue") { overdue.amount = round2(overdue.amount + r.home); overdue.count++; continue; }
    const d = daysBetween(today, r.date);
    const b = buckets.find((x) => d >= x.from && d <= x.to);
    if (b) { b.amount = round2(b.amount + r.home); b.count++; }
  }
  return { overdue, buckets, rows };
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
export type FxLine = {
  invoiceNumber: string; paidOn: string; currency: string; amount: number;
  expectedHome: number; receivedHome: number; fee: number; gainLoss: number; effectiveRate: number | null; invoiceRate: number | null;
};
export type FxSummary = {
  fees: number; feesForeign: number; gainLoss: number; foreignReceived: number;
  byCurrency: { currency: string; amount: number; received: number; fees: number; gainLoss: number }[];
  lines: FxLine[];
};

/** Fees on all payments, and exchange gain/loss on foreign ones (home currency). */
export function fxSummary(payments: PaymentRow[], invoices: InvoiceRow[], homeCur: string, since: string): FxSummary {
  const byId = new Map(invoices.map((i) => [i.id, i]));
  const out: FxSummary = { fees: 0, feesForeign: 0, gainLoss: 0, foreignReceived: 0, byCurrency: [], lines: [] };
  const per = new Map<string, { currency: string; amount: number; received: number; fees: number; gainLoss: number }>();

  for (const p of payments) {
    if (p.paid_on < since) continue;
    const inv = byId.get(p.invoice_id);
    if (!inv) continue;
    const fee = Number(p.fee || 0);
    out.fees = round2(out.fees + fee);
    const cur = inv.currency || homeCur;
    if (cur === homeCur) continue;

    const received = Number(p.home_amount ?? 0);
    const rate = Number(inv.fx_rate) > 0 ? Number(inv.fx_rate) : null;
    const expected = rate ? round2(Number(p.amount) * rate) : round2(received + fee);
    const gl = round2(received + fee - expected);
    out.feesForeign = round2(out.feesForeign + fee);
    out.gainLoss = round2(out.gainLoss + gl);
    out.foreignReceived = round2(out.foreignReceived + received);
    out.lines.push({
      invoiceNumber: inv.number, paidOn: p.paid_on, currency: cur, amount: Number(p.amount),
      expectedHome: expected, receivedHome: received, fee, gainLoss: gl,
      effectiveRate: Number(p.amount) > 0 ? round2(((received + fee) / Number(p.amount)) * 10000) / 10000 : null,
      invoiceRate: rate,
    });
    const c = per.get(cur) ?? { currency: cur, amount: 0, received: 0, fees: 0, gainLoss: 0 };
    c.amount = round2(c.amount + Number(p.amount)); c.received = round2(c.received + received);
    c.fees = round2(c.fees + fee); c.gainLoss = round2(c.gainLoss + gl);
    per.set(cur, c);
  }
  out.byCurrency = Array.from(per.values());
  out.lines.sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  return out;
}

// ---------------------------------------------------------------------------
export type NextStep = { priority: number; title: string; detail: string; tone: "friendly" | "firm" | "final" };

/** The most useful thing to do next about an unpaid invoice, and why. */
export function nextStep(inv: InvoiceRow, profile: ClientProfile, today: string): NextStep {
  const overdueDays = inv.due_date ? daysBetween(inv.due_date, today) : 0;
  const partial = Number(inv.amount_paid) > 0;
  // Has Zarbill actually emailed this invoice (or a reminder) to the client?
  const emailed = !!inv.sent_at || !!inv.last_reminder_at;

  if (!emailed && overdueDays > -7) {
    return { priority: overdueDays > 0 ? 90 : 45, tone: "friendly", title: "Send the invoice",
      detail: "It hasn't been emailed from Zarbill, so there's no record the client has it. Send it so reminders and tracking can kick in." };
  }
  if (overdueDays <= 0) {
    return { priority: 10, tone: "friendly", title: "Nothing needed yet",
      detail: overdueDays === 0 ? "Due today." : `Due in ${-overdueDays} day${overdueDays === -1 ? "" : "s"}. A heads-up email goes out automatically 3 days before.` };
  }
  if (!inv.viewed_at) {
    return { priority: 85, tone: "friendly", title: "Check they received it",
      detail: `Overdue ${overdueDays} days and the invoice link hasn't been opened. The email may have gone to spam or the wrong address.` };
  }
  if (partial) {
    return { priority: 70, tone: "friendly", title: "Thank them and ask for the rest",
      detail: "Part of it is paid. Acknowledge that and ask when the balance will follow." };
  }
  if (inv.reminders_sent >= 3 && inv.last_reminder_at) {
    return { priority: 95, tone: "final", title: "Follow up personally",
      detail: `All automatic reminders have gone out and it's ${overdueDays} days overdue. A personal email or a call works best now.` };
  }
  if (profile.label === "slow" || overdueDays > 21) {
    return { priority: 80, tone: "firm", title: "Ask for a payment date",
      detail: profile.label === "slow"
        ? `${profile.summary}. Ask directly when payment will be made.`
        : `${overdueDays} days overdue. Ask directly when payment will be made.` };
  }
  if (profile.label === "reliable") {
    return { priority: 50, tone: "friendly", title: "Gentle nudge",
      detail: `${profile.summary}, so this has probably slipped through the cracks.` };
  }
  return { priority: 60, tone: "friendly", title: "Friendly reminder",
    detail: `Opened but unpaid, ${overdueDays} days overdue.` };
}

// app/app/insights/page.tsx — cash forecast, client payment habits, fees & FX.
import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { money, todayISO } from "@/lib/format";
import { clientProfiles, forecast, fxSummary, type InvoiceRow, type PaymentRow } from "@/lib/insights";

export const metadata: Metadata = { title: "Insights" };

const COLS = "id, number, client_id, status, issue_date, due_date, paid_date, total, amount_paid, currency, fx_rate, recurring, recur_next_date, viewed_at, reminders_sent, sent_at";

export default async function InsightsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const [{ data: tenant }, { data: inv }, { data: pays }, { data: clients }] = await Promise.all([
    supabase.from("tenants").select("currency").eq("id", tenantId).maybeSingle(),
    supabase.from("invoices").select(COLS).eq("tenant_id", tenantId),
    supabase.from("payments").select("invoice_id, amount, home_amount, fee, paid_on").eq("tenant_id", tenantId),
    supabase.from("clients").select("id, name").eq("tenant_id", tenantId),
  ]);
  const home = tenant?.currency || "ZAR";
  const today = todayISO();
  const invoices = (inv ?? []) as InvoiceRow[];
  const name = new Map((clients ?? []).map((c: any) => [c.id, c.name as string]));

  const fc = forecast(invoices, home, today);
  const maxBucket = Math.max(1, fc.overdue.amount, ...fc.buckets.map((b) => b.amount));
  const yearStart = today.slice(0, 4) + "-01-01";
  const fx = fxSummary((pays ?? []) as PaymentRow[], invoices, home, yearStart);

  const profiles = clientProfiles(invoices);
  const outstandingBy = new Map<string, number>();
  for (const r of fc.rows) if (r.kind !== "recurring" && r.clientId) outstandingBy.set(r.clientId, (outstandingBy.get(r.clientId) || 0) + r.home);
  const clientRows = Array.from(new Set([...profiles.keys(), ...outstandingBy.keys()]))
    .map((id) => ({ id, name: name.get(id) || "—", p: profiles.get(id), owed: outstandingBy.get(id) || 0 }))
    .sort((a, b) => b.owed - a.owed || (b.p?.avgDaysLate ?? 0) - (a.p?.avgDaysLate ?? 0));

  const empty = invoices.filter((i) => i.status !== "draft").length === 0;

  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar"><div className="ink-tb-title">Insights</div></div>
      <div className="ink-page in-wrap">
        {empty ? (
          <div className="in-card in-empty">
            <h3>Nothing to forecast yet</h3>
            <p>Once you&apos;ve sent a few invoices, this page shows what money is likely to come in over the next
              three months, which clients pay late, and what fees and exchange rates are costing you.</p>
            <Link href="/app/invoices" className="in-link">Go to invoices &rarr;</Link>
          </div>
        ) : (
          <>
            <section>
              <h2 className="in-h">Cash coming in <span>in {home}</span></h2>
              <p className="in-sub">Unpaid invoices and upcoming recurring invoices, timed by each client&apos;s real payment habits.</p>
              <div className="in-bars">
                <Bar label="Overdue now" amount={fc.overdue.amount} count={fc.overdue.count} max={maxBucket} cur={home} warn />
                {fc.buckets.map((b) => <Bar key={b.label} label={b.label} amount={b.amount} count={b.count} max={maxBucket} cur={home} />)}
              </div>

              {fc.rows.length > 0 && (
                <div className="in-card in-tbl-wrap">
                  <table className="in-tbl">
                    <thead><tr><th>Expected</th><th>Invoice</th><th>Client</th><th className="r">Amount</th><th>Why this date</th></tr></thead>
                    <tbody>
                      {fc.rows.slice(0, 40).map((r, i) => (
                        <tr key={i} className={r.kind === "overdue" ? "od" : r.kind === "recurring" ? "rc" : ""}>
                          <td className="mono">{r.kind === "overdue" ? "Overdue" : r.date}</td>
                          <td className="mono">{r.ref}</td>
                          <td>{(r.clientId && name.get(r.clientId)) || "—"}</td>
                          <td className="r mono">
                            {money(r.home, home)}
                            {r.currency !== home && <div className="sub">{money(r.amount, r.currency)}</div>}
                          </td>
                          <td className="why">{r.basis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="in-fine">
                An estimate, not a promise: due dates shifted by how late each client has paid before. Foreign invoices
                are converted at the rate on the day they were created.
              </p>
            </section>

            <section>
              <h2 className="in-h">How your clients pay</h2>
              <div className="in-card in-tbl-wrap">
                <table className="in-tbl">
                  <thead><tr><th>Client</th><th>Track record</th><th className="r">Owed now</th></tr></thead>
                  <tbody>
                    {clientRows.length === 0 ? (
                      <tr><td colSpan={3} className="why">No paid invoices yet.</td></tr>
                    ) : clientRows.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>
                          <span className={"in-pill " + (c.p?.label === "reliable" ? "ok" : c.p?.label === "slow" ? "bad" : c.p ? "mid" : "new")}>
                            {c.p ? c.p.label : "new"}
                          </span>{" "}
                          <span className="why">{c.p ? c.p.summary : "No payment history yet"}</span>
                        </td>
                        <td className="r mono">{c.owed > 0 ? money(c.owed, home) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="in-h">Fees &amp; exchange rates <span>{today.slice(0, 4)} so far</span></h2>
              <div className="in-stats">
                <Stat label="Fees paid" value={money(fx.fees, home)} note="All payments. Usually tax-deductible." />
                <Stat label="Exchange gain / loss" value={(fx.gainLoss > 0 ? "+" : "") + money(fx.gainLoss, home)}
                  tone={fx.gainLoss < 0 ? "bad" : fx.gainLoss > 0 ? "ok" : undefined}
                  note="What you received vs. the rate when you invoiced." />
                <Stat label="Received from abroad" value={money(fx.foreignReceived, home)} note={fx.byCurrency.map((c) => money(c.amount, c.currency)).join(" + ") || "No foreign payments yet"} />
              </div>
              {fx.lines.length > 0 ? (
                <div className="in-card in-tbl-wrap">
                  <table className="in-tbl">
                    <thead><tr><th>Paid</th><th>Invoice</th><th className="r">Amount</th><th className="r">Invoiced rate</th><th className="r">Your rate</th><th className="r">Fees</th><th className="r">Gain / loss</th></tr></thead>
                    <tbody>
                      {fx.lines.slice(0, 30).map((l, i) => (
                        <tr key={i}>
                          <td className="mono">{l.paidOn}</td>
                          <td className="mono">{l.invoiceNumber}</td>
                          <td className="r mono">{money(l.amount, l.currency)}<div className="sub">{money(l.receivedHome, home)} received</div></td>
                          <td className="r mono">{l.invoiceRate ? l.invoiceRate.toFixed(4) : "—"}</td>
                          <td className="r mono">{l.effectiveRate ? l.effectiveRate.toFixed(4) : "—"}</td>
                          <td className="r mono">{money(l.fee, home)}</td>
                          <td className={"r mono " + (l.gainLoss < 0 ? "neg" : l.gainLoss > 0 ? "pos" : "")}>{(l.gainLoss > 0 ? "+" : "") + money(l.gainLoss, home)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="in-sub">When you record a payment on a foreign-currency invoice, enter what landed in your account and any fees. It shows up here.</p>
              )}
              <p className="in-fine">
                Exchange rates: <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Rates By Exchange Rate API</a>, updated daily.
              </p>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Bar({ label, amount, count, max, cur, warn }: { label: string; amount: number; count: number; max: number; cur: string; warn?: boolean }) {
  return (
    <div className={"in-bar" + (warn ? " warn" : "")}>
      <div className="in-bar-top"><span>{label}</span><strong>{money(amount, cur)}</strong></div>
      <div className="in-bar-track"><div className="in-bar-fill" style={{ width: Math.max(amount > 0 ? 3 : 0, (amount / max) * 100) + "%" }} /></div>
      <div className="in-bar-sub">{count} invoice{count === 1 ? "" : "s"}</div>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "ok" | "bad" }) {
  return (
    <div className="in-card in-stat">
      <div className="in-stat-l">{label}</div>
      <div className={"in-stat-v " + (tone || "")}>{value}</div>
      <div className="in-stat-n">{note}</div>
    </div>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.in-wrap { display: grid; gap: 40px; max-width: 1000px; }
.in-h { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 28px; margin: 0 0 6px; }
.in-h span { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 1px; margin-left: 8px; }
.in-sub { color: var(--muted2); font-size: 13px; margin: 0 0 18px; line-height: 1.6; }
.in-fine { color: var(--muted); font-size: 11px; margin: 10px 0 0; line-height: 1.6; }
.in-fine a, .in-link { color: var(--electric); text-decoration: none; }
.in-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 14px; }
.in-empty { padding: 40px; text-align: center; color: var(--muted2); }
.in-empty h3 { color: var(--text); margin: 0 0 8px; }
.in-bars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.in-bar { background: var(--ink2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.in-bar-top { display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; }
.in-bar-top strong { font-family: 'Instrument Serif', serif; font-size: 26px; color: var(--text); letter-spacing: 0; text-transform: none; font-weight: 400; }
.in-bar-track { height: 6px; background: var(--ink3); border-radius: 6px; margin: 12px 0 8px; overflow: hidden; }
.in-bar-fill { height: 100%; background: linear-gradient(90deg, var(--electric), var(--electric2)); border-radius: 6px; }
.in-bar.warn .in-bar-fill { background: var(--electric3); }
.in-bar.warn strong { color: var(--electric3); }
.in-bar-sub { font-size: 11px; color: var(--muted2); }
.in-tbl-wrap { overflow-x: auto; }
.in-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.in-tbl th { text-align: left; padding: 10px 16px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); background: var(--ink3); white-space: nowrap; }
.in-tbl td { padding: 11px 16px; border-top: 1px solid var(--border); vertical-align: top; }
.in-tbl .r { text-align: right; }
.in-tbl .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; white-space: nowrap; }
.in-tbl .sub { font-size: 10px; color: var(--muted); margin-top: 3px; }
.in-tbl .why { color: var(--muted2); font-size: 12px; }
.in-tbl tr.od td:first-child { color: var(--electric3); }
.in-tbl tr.rc td:nth-child(2) { color: var(--violet); }
.in-tbl .neg { color: var(--electric3); }
.in-tbl .pos { color: var(--electric); }
.in-pill { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 10px; }
.in-pill.ok { background: rgba(79,255,176,0.12); color: var(--electric); }
.in-pill.mid { background: rgba(255,201,64,0.12); color: var(--gold); }
.in-pill.bad { background: rgba(255,107,107,0.12); color: var(--electric3); }
.in-pill.new { background: rgba(110,110,136,0.2); color: var(--muted2); }
.in-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 14px 0 16px; }
.in-stat { padding: 16px; }
.in-stat-l { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); }
.in-stat-v { font-family: 'Instrument Serif', serif; font-size: 28px; margin: 8px 0 6px; }
.in-stat-v.ok { color: var(--electric); } .in-stat-v.bad { color: var(--electric3); }
.in-stat-n { font-size: 11px; color: var(--muted2); line-height: 1.5; }
@media (max-width: 760px) {
  .ink-page { padding: 20px 16px; }
  .in-bars { grid-template-columns: 1fr 1fr; }
  .in-stats { grid-template-columns: 1fr; }
}
`;

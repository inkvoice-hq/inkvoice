// app/i/[token]/page.tsx
// -----------------------------------------------------------------------------
// Public hosted invoice: zarbill.com/i/<token>
// The link in every invoice and reminder email. No login needed; the token is
// a random UUID, so invoices can't be guessed. Uses the service-role client
// because the viewer is the business's CLIENT, not a Zarbill user.
// -----------------------------------------------------------------------------
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { money, round2, displayStatus } from "@/lib/format";
import { niceDate, daysOverdue } from "@/lib/reminders";
import { InvoiceActions } from "./InvoiceActions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const load = cache(async (token: string) => {
  if (!UUID_RE.test(token)) return null;
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices").select("*").eq("public_token", token).maybeSingle();
  if (!inv || inv.status === "draft") return null;

  const [{ data: tenant }, clientRes] = await Promise.all([
    admin.from("tenants")
      .select("name, email, phone, address, website, tax_reg, logo_url, currency, invoice_notes, footer_message")
      .eq("id", inv.tenant_id).maybeSingle(),
    inv.client_id
      ? admin.from("clients").select("name, contact, email, address, tax_id").eq("id", inv.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { inv, tenant, client: clientRes.data as any };
});

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params;
  const d = await load(token);
  if (!d) return { title: "Invoice not found", robots: { index: false, follow: false } };
  const biz = d.tenant?.name || "Invoice";
  return {
    title: { absolute: "Invoice " + d.inv.number + " from " + biz },
    robots: { index: false, follow: false },
  };
}

export default async function HostedInvoicePage(
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const d = await load(token);
  if (!d) notFound();
  const { inv, tenant, client } = d;

  const cur = tenant?.currency || "ZAR";
  const biz = tenant?.name || "Your supplier";
  const st = displayStatus(inv.status, inv.due_date);
  const taxAmt = round2(Number(inv.subtotal) * Number(inv.tax_rate || 0) / 100);
  const notes = (inv.notes || tenant?.invoice_notes || "").trim();
  const items: any[] = Array.isArray(inv.items) ? inv.items : [];

  let pill = { cls: "due", text: inv.due_date ? "Due " + niceDate(inv.due_date) : "Awaiting payment" };
  if (st === "paid") pill = { cls: "paid", text: "Paid" + (inv.paid_date ? " " + niceDate(inv.paid_date) : "") };
  else if (st === "overdue" && inv.due_date) {
    const n = daysOverdue(inv.due_date);
    pill = { cls: "over", text: "Overdue by " + n + " day" + (n === 1 ? "" : "s") };
  }

  return (
    <main className="hi-wrap">
      <style>{css}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="hi-bar">
        <div className="hi-bar-l">
          <div className="hi-bar-title">Invoice {inv.number} from {biz}</div>
          <div className="hi-bar-amt">
            {money(inv.total, cur)} <span className={"hi-pill hi-" + pill.cls}>{pill.text}</span>
          </div>
        </div>
        <InvoiceActions token={token} />
      </div>

      <div className="hi-paper">
        {st === "paid" && <div className="hi-stamp">PAID</div>}

        <div className="hi-top">
          <div>
            {tenant?.logo_url
              ? <img src={tenant.logo_url} alt={biz} className="hi-logo-img" />
              : <div className="hi-logo">{biz}</div>}
            <div className="hi-small">
              {tenant?.logo_url && <>{biz}<br /></>}
              {(tenant?.address || "").split("\n").filter(Boolean).map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
              {tenant?.email && <>{tenant.email}<br /></>}
              {tenant?.phone && <>{tenant.phone}<br /></>}
              {tenant?.tax_reg && <>Tax/VAT no: {tenant.tax_reg}</>}
            </div>
          </div>
          <div className="hi-meta">
            <div className="hi-kicker">Tax Invoice</div>
            <div className="hi-num">{inv.number}</div>
            <div className="hi-small">
              Issued: <strong>{niceDate(inv.issue_date) || "—"}</strong><br />
              Due: <strong>{niceDate(inv.due_date) || "—"}</strong>
            </div>
          </div>
        </div>

        {client && (
          <div className="hi-billto">
            <div className="hi-label">Bill to</div>
            <strong>{client.name}</strong>
            <div className="hi-small">
              {client.contact && <>{client.contact}<br /></>}
              {(client.address || "").split("\n").filter(Boolean).map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
              {client.email && <>{client.email}<br /></>}
              {client.tax_id && <>Tax/VAT no: {client.tax_id}</>}
            </div>
          </div>
        )}

        {inv.description && <div className="hi-project"><strong>Project:</strong> {inv.description}</div>}

        <div className="hi-tbl-wrap">
          <table className="hi-tbl">
            <thead>
              <tr><th>Description</th><th className="c">Qty</th><th className="r hide-sm">Rate</th><th className="r">Amount</th></tr>
            </thead>
            <tbody>
              {items.map((li, i) => (
                <tr key={i}>
                  <td>{li.desc}</td>
                  <td className="c">{li.qty}</td>
                  <td className="r hide-sm">{money(li.rate, cur)}</td>
                  <td className="r"><strong>{money(li.total, cur)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hi-totals">
          <div><span>Subtotal</span><span>{money(inv.subtotal, cur)}</span></div>
          {Number(inv.tax_rate) > 0 && (
            <div><span>Tax ({Number(inv.tax_rate)}%)</span><span>{money(taxAmt, cur)}</span></div>
          )}
          {Number(inv.discount) > 0 && (
            <div><span>Discount</span><span>-{money(inv.discount, cur)}</span></div>
          )}
          <div className="hi-grand"><span>Total due</span><span>{money(inv.total, cur)}</span></div>
        </div>

        {notes && (
          <div className="hi-notes">
            <div className="hi-label">How to pay</div>
            {notes.split("\n").map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
          </div>
        )}

        <div className="hi-footer">{tenant?.footer_message || "Thank you for your business!"}</div>
      </div>

      <div className="hi-after">
        {tenant?.email && (
          <p>Questions about this invoice? <a href={"mailto:" + tenant.email + "?subject=" + encodeURIComponent("Invoice " + inv.number)}>Email {biz}</a></p>
        )}
        <p className="hi-powered">
          Sent with <a href="/?ref=invoice">Zarbill</a>. Free invoicing for freelancers.
        </p>
      </div>
    </main>
  );
}

const css = `
body { background: #eef0f3 !important; }
.hi-wrap { min-height: 100vh; padding: 28px 16px 48px; font-family: 'Syne', system-ui, sans-serif; color: #111; }
.hi-bar { max-width: 820px; margin: 0 auto 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hi-bar-title { font-size: 13px; color: #555; }
.hi-bar-amt { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 2px; }
.hi-pill { font-size: 11px; font-weight: 600; padding: 4px 11px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.3px; }
.hi-due { background: #fff4d6; color: #8a6200; }
.hi-over { background: #ffe1e1; color: #b42318; }
.hi-paid { background: #d9fbe9; color: #067647; }
.hi-btn { background: #111; color: #fff; border: none; border-radius: 9px; padding: 12px 22px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
.hi-btn:hover { background: #333; }
.hi-paper { position: relative; overflow: hidden; max-width: 820px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 10px 40px rgba(16,24,40,0.08); padding: 48px 52px; font-size: 13px; }
.hi-stamp { position: absolute; top: 170px; right: 60px; transform: rotate(-14deg); border: 4px solid #12b76a; color: #12b76a; font-size: 34px; font-weight: 800; letter-spacing: 6px; padding: 4px 18px; border-radius: 8px; opacity: 0.55; pointer-events: none; }
.hi-top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 34px; }
.hi-logo { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; margin-bottom: 8px; }
.hi-logo-img { max-height: 60px; max-width: 220px; display: block; margin-bottom: 10px; }
.hi-small { font-size: 12px; color: #666; line-height: 1.7; }
.hi-meta { text-align: right; }
.hi-kicker, .hi-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2.5px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
.hi-num { font-size: 22px; font-weight: 800; margin: 2px 0 8px; }
.hi-billto { margin-bottom: 24px; }
.hi-project { margin-bottom: 20px; color: #444; }
.hi-tbl-wrap { overflow-x: auto; }
.hi-tbl { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
.hi-tbl th { background: #f6f7f9; padding: 10px 13px; font-size: 10px; letter-spacing: 1.4px; color: #888; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; text-align: left; font-weight: 500; }
.hi-tbl td { padding: 11px 13px; border-bottom: 1px solid #f0f1f3; }
.hi-tbl .c { text-align: center; } .hi-tbl .r { text-align: right; white-space: nowrap; }
.hi-totals { max-width: 280px; margin-left: auto; }
.hi-totals div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f0f1f3; }
.hi-totals .hi-grand { font-size: 17px; font-weight: 800; border-bottom: none; border-top: 2px solid #111; padding-top: 12px; margin-top: 4px; }
.hi-notes { margin-top: 30px; padding: 18px; background: #f6f7f9; border-radius: 10px; font-size: 13px; color: #444; line-height: 1.7; }
.hi-footer { margin-top: 30px; padding-top: 18px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
.hi-after { max-width: 820px; margin: 22px auto 0; text-align: center; font-size: 13px; color: #555; }
.hi-after a { color: #111; font-weight: 600; }
.hi-powered { font-size: 12px; color: #888; margin-top: 10px; }
@media (max-width: 640px) {
  .hi-paper { padding: 28px 20px; }
  .hi-top { flex-direction: column; }
  .hi-meta { text-align: left; }
  .hi-stamp { top: 120px; right: 20px; font-size: 26px; }
  .hi-bar-amt { font-size: 22px; }
  .hi-btn { width: 100%; }
  .hi-tbl th, .hi-tbl td { padding: 10px 6px; }
  .hi-tbl .hide-sm { display: none; }
  .hi-totals { max-width: none; }
}
@media print {
  body { background: #fff !important; }
  .hi-wrap { padding: 0; }
  .hi-bar, .hi-after { display: none !important; }
  .hi-paper { box-shadow: none; border-radius: 0; padding: 0; max-width: none; }
}
`;

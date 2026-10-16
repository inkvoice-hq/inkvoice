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
import { money, round2, displayStatus, balanceDue, fillPaymentLink, curOf } from "@/lib/format";
import { niceDate, daysOverdue } from "@/lib/reminders";
import { InvoiceActions } from "./InvoiceActions";
import { hostedCss as css } from "@/lib/hosted-css";

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
      .select("name, email, phone, address, website, tax_reg, logo_url, currency, invoice_notes, footer_message, payment_link")
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

  const cur = curOf(inv, tenant?.currency);
  const biz = tenant?.name || "Your supplier";
  const st = displayStatus(inv.status, inv.due_date, inv.amount_paid);
  const paidSoFar = Number(inv.amount_paid || 0);
  const balance = balanceDue(inv);
  const payUrl = st !== "paid" && balance > 0 ? fillPaymentLink(tenant?.payment_link, balance, inv.number, cur) : null;
  const taxAmt = round2(Number(inv.subtotal) * Number(inv.tax_rate || 0) / 100);
  const notes = (inv.notes || tenant?.invoice_notes || "").trim();
  const items: any[] = Array.isArray(inv.items) ? inv.items : [];

  let pill = { cls: "due", text: inv.due_date ? "Due " + niceDate(inv.due_date) : "Awaiting payment" };
  if (st === "paid") pill = { cls: "paid", text: "Paid" + (inv.paid_date ? " " + niceDate(inv.paid_date) : "") };
  else if (st === "partial") pill = { cls: "due", text: "Part paid · due " + (inv.due_date ? niceDate(inv.due_date) : "") };
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
            {money(st === "paid" ? inv.total : balance, cur)} <span className={"hi-pill hi-" + pill.cls}>{pill.text}</span>
          </div>
          {paidSoFar > 0 && st !== "paid" && (
            <div className="hi-bar-title">{money(paidSoFar, cur)} of {money(inv.total, cur)} already paid</div>
          )}
        </div>
        <InvoiceActions token={token} payUrl={payUrl} payLabel={"Pay " + money(balance, cur)} />
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
          {paidSoFar > 0 ? (
            <>
              <div><span>Total</span><span>{money(inv.total, cur)}</span></div>
              <div className="hi-paidrow"><span>Paid</span><span>-{money(paidSoFar, cur)}</span></div>
              <div className="hi-grand"><span>Balance due</span><span>{money(balance, cur)}</span></div>
            </>
          ) : (
            <div className="hi-grand"><span>Total due</span><span>{money(inv.total, cur)}</span></div>
          )}
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

// app/q/[token]/page.tsx
// -----------------------------------------------------------------------------
// Public quote page: zarbill.com/q/<token>. The client reviews the quote and
// accepts (or declines) it with one click. The owner can preview drafts here.
// -----------------------------------------------------------------------------
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { money, round2, todayISO } from "@/lib/format";
import { niceDate } from "@/lib/reminders";
import { viewerIsOwner } from "@/lib/public-quote";
import { hostedCss as css } from "@/lib/hosted-css";
import { QuoteActions } from "./QuoteActions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const load = cache(async (token: string) => {
  if (!UUID_RE.test(token)) return null;
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("*").eq("public_token", token).maybeSingle();
  if (!q) return null;
  const owner = await viewerIsOwner(q.tenant_id);
  if (q.status === "draft" && !owner) return null;

  const [{ data: tenant }, clientRes] = await Promise.all([
    admin.from("tenants")
      .select("name, email, phone, address, tax_reg, logo_url, currency, footer_message")
      .eq("id", q.tenant_id).maybeSingle(),
    q.client_id
      ? admin.from("clients").select("name, contact, email, address, tax_id").eq("id", q.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { q, tenant, client: clientRes.data as any, owner };
});

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params;
  const d = await load(token);
  if (!d) return { title: "Quote not found", robots: { index: false, follow: false } };
  return {
    title: { absolute: "Quote " + d.q.number + " from " + (d.tenant?.name || "your supplier") },
    robots: { index: false, follow: false },
  };
}

export default async function HostedQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await load(token);
  if (!d) notFound();
  const { q, tenant, client, owner } = d;

  const cur = tenant?.currency || "ZAR";
  const biz = tenant?.name || "Your supplier";
  const items: any[] = Array.isArray(q.items) ? q.items : [];
  const taxAmt = round2(Number(q.subtotal) * Number(q.tax_rate || 0) / 100);
  const expired = !!q.valid_until && q.valid_until < todayISO() && (q.status === "sent" || q.status === "draft");

  let pill = { cls: "due", text: q.valid_until ? "Valid until " + niceDate(q.valid_until) : "Awaiting your approval" };
  if (q.status === "accepted" || q.status === "converted") pill = { cls: "paid", text: "Accepted" + (q.accepted_at ? " " + niceDate(q.accepted_at.slice(0, 10)) : "") };
  else if (q.status === "declined") pill = { cls: "over", text: "Declined" };
  else if (expired) pill = { cls: "over", text: "Expired " + niceDate(q.valid_until) };

  return (
    <main className="hi-wrap">
      <style>{css}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {owner && (
        <div className="hi-preview">
          Preview: this is exactly what your client sees{q.status === "draft" ? " once you send the quote" : ""}.
          The accept button only works from their link.
        </div>
      )}

      <div className="hi-bar">
        <div className="hi-bar-l">
          <div className="hi-bar-title">Quote {q.number} from {biz}</div>
          <div className="hi-bar-amt">
            {money(q.total, cur)} <span className={"hi-pill hi-" + pill.cls}>{pill.text}</span>
          </div>
        </div>
        <QuoteActions
          token={token}
          canRespond={!owner && q.status === "sent" && !expired}
          clientName={client?.contact || client?.name || ""}
        />
      </div>

      <div className="hi-paper">
        {(q.status === "accepted" || q.status === "converted") && <div className="hi-stamp">ACCEPTED</div>}

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
            <div className="hi-kicker">Quote</div>
            <div className="hi-num">{q.number}</div>
            <div className="hi-small">
              Date: <strong>{niceDate(q.issue_date) || "—"}</strong><br />
              Valid until: <strong>{niceDate(q.valid_until) || "—"}</strong>
            </div>
          </div>
        </div>

        {client && (
          <div className="hi-billto">
            <div className="hi-label">Prepared for</div>
            <strong>{client.name}</strong>
            <div className="hi-small">
              {client.contact && <>{client.contact}<br /></>}
              {(client.address || "").split("\n").filter(Boolean).map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
              {client.email && <>{client.email}</>}
            </div>
          </div>
        )}

        {q.description && <div className="hi-project"><strong>Project:</strong> {q.description}</div>}

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
          <div><span>Subtotal</span><span>{money(q.subtotal, cur)}</span></div>
          {Number(q.tax_rate) > 0 && <div><span>Tax ({Number(q.tax_rate)}%)</span><span>{money(taxAmt, cur)}</span></div>}
          {Number(q.discount) > 0 && <div><span>Discount</span><span>-{money(q.discount, cur)}</span></div>}
          <div className="hi-grand"><span>Total</span><span>{money(q.total, cur)}</span></div>
        </div>

        {q.notes && (
          <div className="hi-notes">
            <div className="hi-label">Notes</div>
            {String(q.notes).split("\n").map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
          </div>
        )}

        <div className="hi-footer">{tenant?.footer_message || "Thank you for considering us!"}</div>
      </div>

      <div className="hi-after">
        {tenant?.email && (
          <p>Questions about this quote? <a href={"mailto:" + tenant.email + "?subject=" + encodeURIComponent("Quote " + q.number)}>Email {biz}</a></p>
        )}
        <p className="hi-powered">Sent with <a href="/?ref=quote">Zarbill</a>. Free invoicing for freelancers.</p>
      </div>
    </main>
  );
}

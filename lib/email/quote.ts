"use server";
// lib/email/quote.ts — "Email quote to client" button.
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { money } from "@/lib/format";
import { niceDate, esc, SITE_URL } from "@/lib/reminders";

export async function sendQuoteEmail(quoteId: string): Promise<{ ok: boolean; message: string }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: q } = await supabase.from("quotes").select("*").eq("tenant_id", tenantId).eq("id", quoteId).maybeSingle();
  if (!q) return { ok: false, message: "Quote not found." };
  if (q.status === "converted") return { ok: false, message: "This quote is already an invoice." };

  const { data: tenant } = await supabase.from("tenants")
    .select("name, logo_url, email, phone, currency, footer_message").eq("id", tenantId).maybeSingle();
  const { data: client } = q.client_id
    ? await supabase.from("clients").select("name, contact, email").eq("tenant_id", tenantId).eq("id", q.client_id).maybeSingle()
    : { data: null };
  if (!client?.email) return { ok: false, message: "That client has no email address. Add one under Clients first." };

  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, message: "Email sending is not configured yet." };

  const cur = tenant?.currency ?? "ZAR";
  const biz = tenant?.name || "Your Business";
  const hi = (client.contact || "").trim().split(/\s+/)[0] || client.name;
  const link = SITE_URL + "/q/" + q.public_token;

  const rows = (q.items ?? []).map((li: any) =>
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eee">' + esc(li.desc) +
    '</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee">' + money(li.total, cur) + "</td></tr>").join("");

  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:580px;margin:0 auto;color:#111">' +
    (tenant?.logo_url
      ? '<img src="' + esc(tenant.logo_url) + '" alt="' + esc(biz) + '" style="max-height:52px;max-width:200px;margin:0 0 14px;display:block" />'
      : '<h2 style="margin:0 0 14px">' + esc(biz) + "</h2>") +
    '<p style="color:#666;font-size:13px;margin:0 0 22px">Quote ' + esc(q.number) + "</p>" +
    "<p>Hi " + esc(hi) + ",</p>" +
    "<p>Here is your quote for <strong>" + money(q.total, cur) + "</strong>" +
    (q.valid_until ? ", valid until <strong>" + esc(niceDate(q.valid_until)) + "</strong>" : "") + ". " +
    "You can view the details and accept it online with one click.</p>" +
    '<p style="margin:24px 0"><a href="' + esc(link) + '" style="display:inline-block;background:#12b76a;color:#fff;text-decoration:none;' +
    'padding:13px 26px;border-radius:8px;font-size:14px;font-weight:bold">View &amp; accept quote</a></p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">' + rows +
    '<tr><td align="right" style="padding-top:12px"><strong>Total</strong></td><td align="right" style="padding-top:12px"><strong>' +
    money(q.total, cur) + "</strong></td></tr></table>" +
    '<p style="margin-top:26px;font-size:13px;color:#555">Questions? Just reply to this email to reach ' + esc(biz) + ".</p>" +
    '<p style="font-size:11px;color:#aaa;margin-top:18px">Sent with <a href="' + SITE_URL + '/?ref=quote" style="color:#aaa">Zarbill</a></p></div>';

  const resend = new Resend(key);
  const from = process.env.INVOICE_FROM_EMAIL || "invoices@zarbill.com";
  const { error } = await resend.emails.send({
    from: biz.replace(/[<>"]/g, "") + " <" + from + ">",
    replyTo: tenant?.email || undefined,
    to: client.email,
    subject: "Quote " + q.number + " from " + biz + " — " + money(q.total, cur),
    html,
  });
  if (error) return { ok: false, message: error.message || "Send failed." };

  await supabase.from("quotes").update({
    sent_at: new Date().toISOString(),
    ...(q.status === "draft" ? { status: "sent" } : {}),
  }).eq("tenant_id", tenantId).eq("id", quoteId);

  return { ok: true, message: "Quote sent to " + client.email };
}

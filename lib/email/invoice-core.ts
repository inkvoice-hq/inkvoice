// lib/email/invoice-core.ts
// -----------------------------------------------------------------------------
// Builds and sends the "here is your invoice" email. Shared by:
//   - the Send button in the app (lib/email/invoice.ts, logged-in user)
//   - the daily job: scheduled sends + recurring invoices (service-role client)
// Plain module: never import into a client component.
// -----------------------------------------------------------------------------
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { money, balanceDue, fillPaymentLink } from "@/lib/format";
import { invoiceUrl, niceDate, esc, SITE_URL } from "@/lib/reminders";

export type SendResult = { ok: boolean; message: string };

export function payButtonHtml(href: string, label = "Pay now"): string {
  return '<a href="' + esc(href) + '" style="display:inline-block;background:#12b76a;color:#fff;text-decoration:none;' +
    'padding:13px 26px;border-radius:8px;font-size:14px;font-weight:bold;margin-right:8px">' + esc(label) + "</a>";
}

export function viewButtonHtml(href: string, label = "View invoice online"): string {
  return '<a href="' + esc(href) + '" style="display:inline-block;background:#111;color:#fff;text-decoration:none;' +
    'padding:13px 26px;border-radius:8px;font-size:14px;font-weight:bold">' + esc(label) + "</a>";
}

export async function deliverInvoiceEmail(
  supabase: SupabaseClient, tenantId: string, invoiceId: string
): Promise<SendResult> {
  const { data: inv } = await supabase
    .from("invoices").select("*")
    .eq("tenant_id", tenantId).eq("id", invoiceId).maybeSingle();
  if (!inv) return { ok: false, message: "Invoice not found." };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, logo_url, email, phone, address, currency, invoice_notes, footer_message, payment_link")
    .eq("id", tenantId).maybeSingle();

  let client: { name: string; email: string | null } | null = null;
  if (inv.client_id) {
    const { data } = await supabase
      .from("clients").select("name, email")
      .eq("tenant_id", tenantId).eq("id", inv.client_id).maybeSingle();
    client = data as any;
  }
  if (!client?.email) {
    return { ok: false, message: "That client has no email address. Add one under Clients first." };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, message: "Email sending is not configured yet." };

  const cur = tenant?.currency ?? "ZAR";
  const biz = tenant?.name || "Your Business";
  const paid = Number(inv.amount_paid || 0);
  const balance = balanceDue(inv);
  const pay = inv.status !== "paid" && balance > 0
    ? fillPaymentLink(tenant?.payment_link, balance, inv.number, cur)
    : null;

  const td = 'style="padding:8px 0;border-bottom:1px solid #eee"';
  const rows = (inv.items ?? [])
    .map((li: any) =>
      "<tr><td " + td + ">" + esc(li.desc) + '</td><td align="center" ' + td + ">" + esc(String(li.qty)) +
      '</td><td align="right" ' + td + ">" + money(li.rate, cur) +
      '</td><td align="right" ' + td + "><strong>" + money(li.total, cur) + "</strong></td></tr>")
    .join("");

  const taxAmt = Number(inv.subtotal) * Number(inv.tax_rate || 0) / 100;
  const totalRows =
    '<tr><td colspan="3" align="right" style="padding-top:12px">Subtotal</td><td align="right" style="padding-top:12px">' + money(inv.subtotal, cur) + "</td></tr>" +
    (Number(inv.tax_rate) > 0 ? '<tr><td colspan="3" align="right" style="padding-top:6px">Tax (' + Number(inv.tax_rate) + '%)</td><td align="right" style="padding-top:6px">' + money(taxAmt, cur) + "</td></tr>" : "") +
    (Number(inv.discount) > 0 ? '<tr><td colspan="3" align="right" style="padding-top:6px">Discount</td><td align="right" style="padding-top:6px">-' + money(inv.discount, cur) + "</td></tr>" : "") +
    '<tr><td colspan="3" align="right" style="padding-top:8px;font-size:15px"><strong>Total</strong></td><td align="right" style="padding-top:8px;font-size:15px"><strong>' + money(inv.total, cur) + "</strong></td></tr>" +
    (paid > 0 ? '<tr><td colspan="3" align="right" style="padding-top:6px;color:#067647">Paid</td><td align="right" style="padding-top:6px;color:#067647">-' + money(paid, cur) + "</td></tr>" +
      '<tr><td colspan="3" align="right" style="padding-top:8px;font-size:16px"><strong>Balance due</strong></td><td align="right" style="padding-top:8px;font-size:16px"><strong>' + money(balance, cur) + "</strong></td></tr>" : "");

  const notes = (inv.notes || tenant?.invoice_notes || "").trim();
  const notesBlock = notes
    ? '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:13px;color:#555"><strong>Payment instructions</strong><br/>' +
      esc(notes).replace(/\n/g, "<br/>") + "</div>"
    : "";

  const amountLine = inv.status === "paid"
    ? "This invoice has been paid in full. Thank you!"
    : "Please find your invoice below. " + (paid > 0 ? "Balance" : "Total") + " due is <strong>" + money(balance, cur) +
      "</strong>" + (inv.due_date ? " by <strong>" + esc(niceDate(inv.due_date)) + "</strong>" : "") + ".";

  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">' +
    (tenant?.logo_url
      ? '<img src="' + esc(tenant.logo_url) + '" alt="' + esc(biz) + '" style="max-height:52px;max-width:200px;margin:0 0 10px;display:block" />'
      : '<h2 style="margin:0 0 4px">' + esc(biz) + "</h2>") +
    '<p style="color:#666;font-size:13px;margin:0 0 24px">Tax Invoice ' + esc(inv.number) + "</p>" +
    "<p>Hi " + esc(client.name) + ",</p>" +
    "<p>" + amountLine + "</p>" +
    (inv.public_token
      ? '<p style="margin:22px 0 8px">' + (pay ? payButtonHtml(pay, "Pay " + money(balance, cur)) : "") + viewButtonHtml(invoiceUrl(inv.public_token)) + "</p>"
      : "") +
    '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-top:16px">' +
    '<tr><th align="left" style="font-size:11px;color:#999;padding-bottom:6px">DESCRIPTION</th>' +
    '<th align="center" style="font-size:11px;color:#999;padding-bottom:6px">QTY</th>' +
    '<th align="right" style="font-size:11px;color:#999;padding-bottom:6px">RATE</th>' +
    '<th align="right" style="font-size:11px;color:#999;padding-bottom:6px">AMOUNT</th></tr>' +
    rows + totalRows + "</table>" +
    notesBlock +
    '<p style="margin-top:28px;font-size:13px;color:#555">' + esc(tenant?.footer_message || "Thank you for your business!") + "</p>" +
    '<p style="font-size:12px;color:#888">' + esc(biz) +
    (tenant?.email ? " &middot; " + esc(tenant.email) : "") +
    (tenant?.phone ? " &middot; " + esc(tenant.phone) : "") + "</p>" +
    '<p style="font-size:11px;color:#aaa;margin-top:18px">Sent with <a href="' + SITE_URL + '/?ref=invoice" style="color:#aaa">Zarbill</a></p></div>';

  const resend = new Resend(key);
  const from = process.env.INVOICE_FROM_EMAIL || "invoices@zarbill.com";
  const safeBiz = biz.replace(/[<>"]/g, "");

  const { error } = await resend.emails.send({
    from: safeBiz + " <" + from + ">",
    replyTo: tenant?.email || undefined,
    to: client.email,
    subject: "Invoice " + inv.number + " from " + biz +
      (inv.status === "paid" ? " (paid)" : " — " + money(balance, cur) + " due"),
    html,
  });
  if (error) return { ok: false, message: error.message || "Send failed." };

  await supabase.from("invoices")
    .update({
      sent_at: new Date().toISOString(),
      scheduled_send_date: null,
      ...(inv.status === "draft" ? { status: "unpaid" } : {}),
    })
    .eq("tenant_id", tenantId).eq("id", invoiceId);

  return { ok: true, message: "Invoice sent to " + client.email };
}

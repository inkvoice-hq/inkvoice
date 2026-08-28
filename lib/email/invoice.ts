"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { money } from "@/lib/format";


function niceDate(d: string | null): string {
  if (!d) return "";
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const parts = String(d).slice(0, 10).split("-");
  if (parts.length !== 3) return String(d);
  const y = parts[0], m = parseInt(parts[1], 10), day = parseInt(parts[2], 10);
  if (!months[m - 1]) return String(d);
  return day + " " + months[m - 1] + " " + y;
}

export async function sendInvoiceEmail(
  invoiceId: string
): Promise<{ ok: boolean; message: string }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices").select("*")
    .eq("tenant_id", tenantId).eq("id", invoiceId).maybeSingle();
  if (!inv) return { ok: false, message: "Invoice not found." };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, email, phone, address, currency, invoice_notes, footer_message")
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

  const rows = (inv.items ?? [])
    .map(
      (li: any) =>
        '<tr><td style="padding:8px 0;border-bottom:1px solid #eee">' + li.desc +
        '</td><td align="center" style="padding:8px 0;border-bottom:1px solid #eee">' + li.qty +
        '</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee">' + money(li.rate, cur) +
        '</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee"><strong>' + money(li.total, cur) +
        "</strong></td></tr>"
    )
    .join("");

  const notes = (inv.notes || tenant?.invoice_notes || "").trim();
  const notesBlock = notes
    ? '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:13px;color:#555"><strong>Payment instructions</strong><br/>' +
      notes.replace(/\n/g, "<br/>") + "</div>"
    : "";

  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">' +
    '<h2 style="margin:0 0 4px">' + biz + "</h2>" +
    '<p style="color:#666;font-size:13px;margin:0 0 24px">Tax Invoice ' + inv.number + "</p>" +
    "<p>Hi " + client.name + ",</p>" +
    "<p>Please find your invoice below. Total due is <strong>" + money(inv.total, cur) +
    "</strong>" + (inv.due_date ? " by <strong>" + niceDate(inv.due_date) + "</strong>" : "") + ".</p>" +
    '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-top:16px">' +
    '<tr><th align="left" style="font-size:11px;color:#999;padding-bottom:6px">DESCRIPTION</th>' +
    '<th align="center" style="font-size:11px;color:#999;padding-bottom:6px">QTY</th>' +
    '<th align="right" style="font-size:11px;color:#999;padding-bottom:6px">RATE</th>' +
    '<th align="right" style="font-size:11px;color:#999;padding-bottom:6px">AMOUNT</th></tr>' +
    rows +
    '<tr><td colspan="3" align="right" style="padding-top:12px">Subtotal</td>' +
    '<td align="right" style="padding-top:12px">' + money(inv.subtotal, cur) + "</td></tr>" +
    '<tr><td colspan="3" align="right" style="padding-top:8px;font-size:16px"><strong>Total Due</strong></td>' +
    '<td align="right" style="padding-top:8px;font-size:16px"><strong>' + money(inv.total, cur) +
    "</strong></td></tr></table>" +
    notesBlock +
    '<p style="margin-top:28px;font-size:13px;color:#555">' +
    (tenant?.footer_message || "Thank you for your business!") + "</p>" +
    '<p style="font-size:12px;color:#888">' + biz +
    (tenant?.email ? " &middot; " + tenant.email : "") +
    (tenant?.phone ? " &middot; " + tenant.phone : "") + "</p></div>";

  const resend = new Resend(key);
  const from = process.env.INVOICE_FROM_EMAIL || "invoices@zarbill.com";

  const { error } = await resend.emails.send({
    from: biz + " <" + from + ">",
    replyTo: tenant?.email || undefined,
    to: client.email,
    subject: "Invoice " + inv.number + " from " + biz + " — " + money(inv.total, cur) + " due",
    html,
  });

  if (error) return { ok: false, message: error.message || "Send failed." };

  if (inv.status === "draft") {
    await supabase.from("invoices").update({ status: "unpaid" })
      .eq("tenant_id", tenantId).eq("id", invoiceId);
  }

  return { ok: true, message: "Invoice sent to " + client.email };
}

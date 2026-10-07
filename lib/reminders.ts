// lib/reminders.ts
// -----------------------------------------------------------------------------
// Automatic payment reminders.
//
// Runs once a day (Vercel Cron -> /api/cron/reminders). For every invoice that
// is unpaid and past its due date, it sends the next reminder in a 3-step
// sequence that gets firmer each time:
//
//   1. 3 days overdue   -> friendly nudge
//   2. 10 days overdue  -> firmer "this is overdue"
//   3. 21 days overdue  -> final reminder
//
// Each email comes FROM "<Business name> <invoices@zarbill.com>" with
// reply-to set to the business's own email, so the client's reply goes to
// the freelancer, not to Zarbill. Every email links to the hosted invoice
// page (/i/<token>), which records when the client first opens it.
//
// Uses the service-role client because there is no logged-in user in a cron
// job. Server-only: never import this into a client component.
// -----------------------------------------------------------------------------
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/format";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://zarbill.com").replace(/\/$/, "");

export const REMINDER_STAGES = [
  { day: 3, tone: "friendly" },
  { day: 10, tone: "firm" },
  { day: 21, tone: "final" },
] as const;

/** Minimum gap between two reminders for the same invoice (catch-up safety). */
const MIN_GAP_DAYS = 3;

export function invoiceUrl(token: string): string {
  return SITE_URL + "/i/" + token;
}

export function niceDate(d: string | null): string {
  if (!d) return "";
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const parts = String(d).slice(0, 10).split("-");
  if (parts.length !== 3) return String(d);
  const m = parseInt(parts[1], 10), day = parseInt(parts[2], 10);
  if (!months[m - 1]) return String(d);
  return day + " " + months[m - 1] + " " + parts[0];
}

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Whole days between due date (YYYY-MM-DD) and today, UTC. Positive = overdue. */
export function daysOverdue(dueDate: string, today = new Date()): number {
  const due = Date.parse(dueDate.slice(0, 10) + "T00:00:00Z");
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((t - due) / 86400000);
}

/** The date the next reminder is due to go out, or null if none left. */
export function nextReminderDate(dueDate: string | null, remindersSent: number): string | null {
  if (!dueDate) return null;
  const stage = REMINDER_STAGES[remindersSent];
  if (!stage) return null;
  const d = new Date(dueDate.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + stage.day);
  return d.toISOString().slice(0, 10);
}

type ReminderTenant = {
  id: string; name: string | null; email: string | null; phone: string | null;
  currency: string | null; logo_url: string | null; invoice_notes: string | null;
  reminders_enabled: boolean | null;
};
type ReminderClient = { id: string; name: string | null; contact: string | null; email: string | null };
type ReminderInvoice = {
  id: string; tenant_id: string; client_id: string | null; number: string;
  due_date: string | null; total: number; status: string; notes: string | null;
  public_token: string; reminders_sent: number; last_reminder_at: string | null;
};

function greetingName(c: ReminderClient): string {
  const contact = (c.contact || "").trim();
  if (contact) return contact.split(/\s+/)[0];
  return (c.name || "there").trim();
}

export function buildReminderEmail(opts: {
  stage: number; // 0, 1, 2
  inv: ReminderInvoice; tenant: ReminderTenant; client: ReminderClient; overdueDays: number;
}) {
  const { stage, inv, tenant, client, overdueDays } = opts;
  const cur = tenant.currency || "ZAR";
  const biz = tenant.name || "Your supplier";
  const amount = money(inv.total, cur);
  const due = niceDate(inv.due_date);
  const hi = greetingName(client);
  const link = invoiceUrl(inv.public_token);
  const days = overdueDays + " day" + (overdueDays === 1 ? "" : "s");

  let subject: string, heading: string, body: string;
  if (stage === 0) {
    subject = "Friendly reminder: invoice " + inv.number + " from " + biz;
    heading = "Just a friendly reminder";
    body = "This is a quick reminder that invoice <strong>" + esc(inv.number) + "</strong> for <strong>" +
      esc(amount) + "</strong> was due on <strong>" + esc(due) + "</strong>. " +
      "If you've already paid, thank you, and please ignore this email.";
  } else if (stage === 1) {
    subject = "Invoice " + inv.number + " is " + days + " overdue";
    heading = "This invoice is now overdue";
    body = "Invoice <strong>" + esc(inv.number) + "</strong> for <strong>" + esc(amount) +
      "</strong> was due on <strong>" + esc(due) + "</strong> and is now <strong>" + esc(days) +
      " overdue</strong>. Please arrange payment as soon as you can, or reply to this email to let " +
      esc(biz) + " know when to expect it.";
  } else {
    subject = "Final reminder: invoice " + inv.number + " (" + amount + ")";
    heading = "Final reminder";
    body = "Invoice <strong>" + esc(inv.number) + "</strong> for <strong>" + esc(amount) +
      "</strong> is now <strong>" + esc(days) + " overdue</strong>. Please make payment as soon as possible. " +
      "If something is wrong with this invoice, reply to this email so it can be sorted out.";
  }

  const notes = (inv.notes || tenant.invoice_notes || "").trim();
  const notesBlock = notes
    ? '<div style="margin-top:22px;padding:16px;background:#f6f7f9;border-radius:8px;font-size:13px;color:#444;line-height:1.6">' +
      "<strong>How to pay</strong><br/>" + esc(notes).replace(/\n/g, "<br/>") + "</div>"
    : "";

  const header = tenant.logo_url
    ? '<img src="' + esc(tenant.logo_url) + '" alt="' + esc(biz) +
      '" style="max-height:52px;max-width:200px;display:block;margin:0 0 18px" />'
    : '<h2 style="margin:0 0 18px;font-size:20px">' + esc(biz) + "</h2>";

  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;padding:8px">' +
    header +
    '<h1 style="font-size:20px;margin:0 0 14px">' + esc(heading) + "</h1>" +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 6px">Hi ' + esc(hi) + ",</p>" +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 22px">' + body + "</p>" +
    '<table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e6e8eb;border-radius:10px;margin-bottom:22px">' +
    '<tr><td style="padding:16px 18px;font-size:13px;color:#666">Invoice</td>' +
    '<td align="right" style="padding:16px 18px;font-size:13px"><strong>' + esc(inv.number) + "</strong></td></tr>" +
    '<tr><td style="padding:0 18px 16px;font-size:13px;color:#666">Due date</td>' +
    '<td align="right" style="padding:0 18px 16px;font-size:13px">' + esc(due) + "</td></tr>" +
    '<tr><td style="padding:14px 18px;border-top:1px solid #e6e8eb;font-size:15px"><strong>Amount due</strong></td>' +
    '<td align="right" style="padding:14px 18px;border-top:1px solid #e6e8eb;font-size:18px"><strong>' + esc(amount) + "</strong></td></tr>" +
    "</table>" +
    '<a href="' + esc(link) + '" style="display:inline-block;background:#111;color:#fff;text-decoration:none;' +
    'padding:13px 26px;border-radius:8px;font-size:14px;font-weight:bold">View invoice</a>' +
    notesBlock +
    '<p style="margin-top:26px;font-size:13px;color:#666;line-height:1.6">Already paid, or have a question? ' +
    "Just reply to this email to reach " + esc(biz) + " directly.</p>" +
    '<p style="margin-top:28px;font-size:11px;color:#aaa">' + esc(biz) +
    (tenant.email ? " &middot; " + esc(tenant.email) : "") +
    (tenant.phone ? " &middot; " + esc(tenant.phone) : "") +
    '<br/>Sent with <a href="' + SITE_URL + '/?ref=reminder" style="color:#aaa">Zarbill</a></p>' +
    "</div>";

  const text =
    "Hi " + hi + ",\n\n" +
    body.replace(/<[^>]+>/g, "") + "\n\n" +
    "View invoice: " + link + "\n\n" +
    (notes ? "How to pay:\n" + notes + "\n\n" : "") +
    "Already paid, or have a question? Reply to this email to reach " + biz + ".\n";

  return { subject, html, text };
}

export type ReminderResult = {
  dryRun: boolean;
  checked: number;
  sent: { invoice: string; to: string; stage: number }[];
  wouldSend: { invoice: string; to: string; stage: number; tenant: string }[];
  skipped: { invoice: string; reason: string }[];
  errors: { invoice: string; error: string }[];
};

export async function runReminders({ dryRun = false } = {}): Promise<ReminderResult> {
  const result: ReminderResult = { dryRun, checked: 0, sent: [], wouldSend: [], skipped: [], errors: [] };
  const supabase = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from("invoices")
    .select("id, tenant_id, client_id, number, due_date, total, status, notes, public_token, reminders_sent, last_reminder_at")
    .in("status", ["unpaid", "overdue"])
    .not("due_date", "is", null)
    .lt("due_date", today)
    .lt("reminders_sent", REMINDER_STAGES.length)
    .not("client_id", "is", null)
    .order("due_date", { ascending: true })
    .limit(500);
  if (error) throw new Error("Load invoices failed: " + error.message);

  const invoices = (rows ?? []) as ReminderInvoice[];
  result.checked = invoices.length;
  if (invoices.length === 0) return result;

  const tenantIds = Array.from(new Set(invoices.map((i) => i.tenant_id)));
  const clientIds = Array.from(new Set(invoices.map((i) => i.client_id!).filter(Boolean)));

  const [{ data: tenants }, { data: clients }] = await Promise.all([
    supabase.from("tenants")
      .select("id, name, email, phone, currency, logo_url, invoice_notes, reminders_enabled")
      .in("id", tenantIds),
    supabase.from("clients").select("id, name, contact, email").in("id", clientIds),
  ]);
  const tenantMap = new Map((tenants ?? []).map((t: any) => [t.id, t as ReminderTenant]));
  const clientMap = new Map((clients ?? []).map((c: any) => [c.id, c as ReminderClient]));

  const key = process.env.RESEND_API_KEY;
  const resend = key ? new Resend(key) : null;
  const fromAddr = process.env.INVOICE_FROM_EMAIL || "invoices@zarbill.com";

  for (const inv of invoices) {
    const tenant = tenantMap.get(inv.tenant_id);
    const client = inv.client_id ? clientMap.get(inv.client_id) : undefined;
    if (!tenant) { result.skipped.push({ invoice: inv.number, reason: "no tenant" }); continue; }
    if (tenant.reminders_enabled === false) { result.skipped.push({ invoice: inv.number, reason: "reminders off" }); continue; }
    if (!client?.email) { result.skipped.push({ invoice: inv.number, reason: "client has no email" }); continue; }

    const overdue = daysOverdue(inv.due_date!, now);
    const stageIdx = inv.reminders_sent ?? 0;
    const stage = REMINDER_STAGES[stageIdx];
    if (!stage || overdue < stage.day) continue; // not time yet

    if (inv.last_reminder_at) {
      const gap = (now.getTime() - Date.parse(inv.last_reminder_at)) / 86400000;
      if (gap < MIN_GAP_DAYS) continue;
    }

    if (dryRun) {
      result.wouldSend.push({ invoice: inv.number, to: client.email, stage: stageIdx + 1, tenant: tenant.name || "" });
      continue;
    }
    if (!resend) { result.errors.push({ invoice: inv.number, error: "RESEND_API_KEY missing" }); continue; }

    // Claim this reminder first so a double-fired cron can never send it twice.
    const { data: claimed } = await supabase
      .from("invoices")
      .update({ reminders_sent: stageIdx + 1, last_reminder_at: now.toISOString() })
      .eq("id", inv.id)
      .eq("reminders_sent", stageIdx)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const email = buildReminderEmail({ stage: stageIdx, inv, tenant, client, overdueDays: overdue });
    const safeBiz = (tenant.name || "Zarbill").replace(/[<>"]/g, "");
    try {
      const { error: sendErr } = await resend.emails.send({
        from: safeBiz + " <" + fromAddr + ">",
        replyTo: tenant.email || undefined,
        to: client.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (sendErr) throw new Error(sendErr.message || "send failed");
      result.sent.push({ invoice: inv.number, to: client.email, stage: stageIdx + 1 });
      await new Promise((r) => setTimeout(r, 600)); // stay under Resend rate limit
    } catch (e: any) {
      // Roll back the claim so tomorrow's run retries.
      await supabase.from("invoices")
        .update({ reminders_sent: stageIdx, last_reminder_at: inv.last_reminder_at })
        .eq("id", inv.id);
      result.errors.push({ invoice: inv.number, error: e?.message || "send failed" });
    }
  }

  return result;
}

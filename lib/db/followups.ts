"use server";
// lib/db/followups.ts
// -----------------------------------------------------------------------------
// Claude-drafted follow-ups. Flow: owner clicks "Draft with Claude" → a draft
// is written and saved (status "draft") → owner edits it → owner clicks Send.
// Nothing is ever emailed without that last click.
// -----------------------------------------------------------------------------
import { Resend } from "resend";
import { attempt, type Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { aiDraftLimit } from "@/lib/plans";
import { money, balanceDue, curOf, daysBetween, todayISO, fillPaymentLink } from "@/lib/format";
import { clientProfiles, profileFor, type InvoiceRow } from "@/lib/insights";
import { draftFollowUpEmail, AI_MODEL, type DraftTone } from "@/lib/ai";
import { esc, invoiceUrl, niceDate, SITE_URL } from "@/lib/reminders";
import type { AiDraft } from "@/lib/db/types";

const TONES: DraftTone[] = ["friendly", "firm", "final"];

function monthStart(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function usageImpl(): Promise<{ used: number; limit: number; enabled: boolean }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const [{ data: t }, { count }] = await Promise.all([
    supabase.from("tenants").select("plan").eq("id", tenantId).maybeSingle(),
    supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", monthStart()),
  ]);
  return { used: count ?? 0, limit: aiDraftLimit(t?.plan), enabled: !!process.env.ANTHROPIC_API_KEY };
}

async function draftImpl(invoiceId: string, tone: DraftTone, ownerNote: string): Promise<AiDraft> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  if (!TONES.includes(tone)) tone = "friendly";

  const usage = await usageImpl();
  if (usage.used >= usage.limit) {
    throw new Error(`You've used all ${usage.limit} AI drafts for this month on your plan.` +
      (usage.limit <= 5 ? " Upgrade to Pro for 200 a month." : ""));
  }

  const { data: inv } = await supabase.from("invoices").select("*").eq("tenant_id", tenantId).eq("id", invoiceId).maybeSingle();
  if (!inv) throw new Error("Invoice not found.");
  if (balanceDue(inv) <= 0) throw new Error("This invoice is already paid.");

  const [{ data: tenant }, { data: client }, { data: history }, { count: priorDrafts }] = await Promise.all([
    supabase.from("tenants").select("name, email, currency").eq("id", tenantId).maybeSingle(),
    inv.client_id
      ? supabase.from("clients").select("name, contact").eq("tenant_id", tenantId).eq("id", inv.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    inv.client_id
      ? supabase.from("invoices").select("id, number, client_id, status, issue_date, due_date, paid_date, total, amount_paid, currency, fx_rate, recurring, recur_next_date, viewed_at, reminders_sent, sent_at")
          .eq("tenant_id", tenantId).eq("client_id", inv.client_id).eq("status", "paid")
      : Promise.resolve({ data: [] }),
    supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("invoice_id", invoiceId).eq("status", "sent"),
  ]);

  const cur = curOf(inv, tenant?.currency);
  const profile = profileFor(clientProfiles((history ?? []) as InvoiceRow[]), inv.client_id);
  const contactFirst = ((client as any)?.contact || "").trim().split(/\s+/)[0] || null;
  const biz = tenant?.name || "My business";

  const out = await draftFollowUpEmail({
    sender_business: biz,
    sender_name_for_signoff: biz,
    client_company: (client as any)?.name || "the client",
    client_contact_first_name: contactFirst,
    invoice_number: inv.number,
    currency: cur,
    invoice_total: money(inv.total, cur),
    already_paid: Number(inv.amount_paid) > 0 ? money(inv.amount_paid, cur) : null,
    balance_due: money(balanceDue(inv), cur),
    issue_date: inv.issue_date ? niceDate(inv.issue_date) : null,
    due_date: inv.due_date ? niceDate(inv.due_date) : null,
    days_overdue: inv.due_date ? Math.max(0, daysBetween(inv.due_date, todayISO())) : 0,
    description: inv.description || null,
    invoice_link_opened: inv.sent_at || inv.last_reminder_at ? !!inv.viewed_at : "unknown",
    automatic_reminders_already_sent: inv.last_reminder_at ? Number(inv.reminders_sent || 0) : 0,
    last_reminder_date: inv.last_reminder_at ? niceDate(String(inv.last_reminder_at).slice(0, 10)) : null,
    client_payment_history: profile.summary,
    previous_personal_follow_ups: priorDrafts ?? 0,
  }, tone, ownerNote);

  const { data: saved, error } = await supabase.from("ai_drafts").insert({
    tenant_id: tenantId, invoice_id: invoiceId, tone, subject: out.subject, body: out.body,
    model: AI_MODEL, input_tokens: out.inputTokens, output_tokens: out.outputTokens,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return saved as AiDraft;
}

async function sendImpl(draftId: string, subject: string, body: string): Promise<{ to: string }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  subject = (subject || "").trim().slice(0, 200);
  body = (body || "").trim().slice(0, 5000);
  if (!subject || !body) throw new Error("Add a subject and a message before sending.");

  const { data: draft } = await supabase.from("ai_drafts").select("*").eq("tenant_id", tenantId).eq("id", draftId).maybeSingle();
  if (!draft) throw new Error("Draft not found.");
  if (draft.status === "sent") throw new Error("This follow-up was already sent.");

  const { data: inv } = await supabase.from("invoices").select("*").eq("tenant_id", tenantId).eq("id", draft.invoice_id).maybeSingle();
  if (!inv) throw new Error("Invoice not found.");
  const [{ data: tenant }, { data: client }] = await Promise.all([
    supabase.from("tenants").select("name, email, phone, logo_url, currency, payment_link").eq("id", tenantId).maybeSingle(),
    inv.client_id
      ? supabase.from("clients").select("name, email").eq("tenant_id", tenantId).eq("id", inv.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const to = (client as any)?.email;
  if (!to) throw new Error("This client has no email address. Add one under Clients first.");
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email sending is not configured yet.");

  const cur = curOf(inv, tenant?.currency);
  const biz = tenant?.name || "Your supplier";
  const bal = balanceDue(inv);
  const pay = fillPaymentLink(tenant?.payment_link, bal, inv.number, cur);
  const btn = (href: string, label: string, bg: string) =>
    '<a href="' + esc(href) + '" style="display:inline-block;background:' + bg + ';color:#fff;text-decoration:none;' +
    'padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;margin:0 8px 8px 0">' + esc(label) + "</a>";
  const paragraphs = body.split(/\n\s*\n/).map((p) =>
    '<p style="font-size:15px;line-height:1.6;margin:0 0 14px">' + esc(p).replace(/\n/g, "<br/>") + "</p>").join("");

  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;padding:8px">' +
    (tenant?.logo_url
      ? '<img src="' + esc(tenant.logo_url) + '" alt="' + esc(biz) + '" style="max-height:52px;max-width:200px;display:block;margin:0 0 18px" />'
      : "") +
    paragraphs +
    '<table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e6e8eb;border-radius:10px;margin:10px 0 18px">' +
    '<tr><td style="padding:14px 16px;font-size:13px;color:#666">Invoice ' + esc(inv.number) +
    (inv.due_date ? " · due " + esc(niceDate(inv.due_date)) : "") + '</td>' +
    '<td align="right" style="padding:14px 16px;font-size:16px"><strong>' + esc(money(bal, cur)) + "</strong></td></tr></table>" +
    (pay ? btn(pay, "Pay " + money(bal, cur), "#12b76a") : "") +
    btn(invoiceUrl(inv.public_token), "View invoice", "#111") +
    '<p style="margin-top:24px;font-size:11px;color:#aaa">' + esc(biz) +
    (tenant?.email ? " &middot; " + esc(tenant.email) : "") +
    '<br/>Sent with <a href="' + SITE_URL + '/?ref=followup" style="color:#aaa">Zarbill</a></p></div>';

  const { error } = await new Resend(key).emails.send({
    from: biz.replace(/[<>"]/g, "") + " <" + (process.env.INVOICE_FROM_EMAIL || "invoices@zarbill.com") + ">",
    replyTo: tenant?.email || undefined,
    to, subject, html,
    text: body + "\n\n" + (pay ? "Pay online: " + pay + "\n" : "") + "View invoice: " + invoiceUrl(inv.public_token),
  });
  if (error) throw new Error(error.message || "Send failed.");

  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("ai_drafts").update({ status: "sent", sent_at: now, subject, body }).eq("tenant_id", tenantId).eq("id", draftId),
    // Give the client breathing room before the next automatic reminder.
    supabase.from("invoices").update({ last_reminder_at: now }).eq("tenant_id", tenantId).eq("id", inv.id),
  ]);
  return { to };
}

async function discardImpl(draftId: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  await supabase.from("ai_drafts").update({ status: "discarded" }).eq("tenant_id", tenantId).eq("id", draftId).eq("status", "draft");
}

// ---- Actions called from the browser (errors returned, not thrown) ----
export async function aiDraftUsage(): Promise<Result<{ used: number; limit: number; enabled: boolean }>> {
  return attempt(() => usageImpl());
}
export async function draftFollowUp(invoiceId: string, tone: DraftTone, ownerNote: string): Promise<Result<AiDraft>> {
  return attempt(() => draftImpl(invoiceId, tone, ownerNote));
}
export async function sendFollowUp(draftId: string, subject: string, body: string): Promise<Result<{ to: string }>> {
  return attempt(() => sendImpl(draftId, subject, body));
}
export async function discardFollowUp(draftId: string): Promise<Result<void>> {
  return attempt(() => discardImpl(draftId));
}

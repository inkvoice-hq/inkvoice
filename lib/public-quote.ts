"use server";
// lib/public-quote.ts — actions on the public quote page (/q/<token>).
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { esc, SITE_URL } from "@/lib/reminders";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function isOwner(tenantId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await createAdminClient().from("memberships")
      .select("tenant_id").eq("user_id", user.id).eq("tenant_id", tenantId).maybeSingle();
    return !!data;
  } catch { return false; }
}

export async function recordQuoteView(token: string): Promise<void> {
  if (!UUID_RE.test(token)) return;
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("id, tenant_id, viewed_at, status").eq("public_token", token).maybeSingle();
  if (!q || q.viewed_at || q.status === "draft") return;
  if (await isOwner(q.tenant_id)) return;
  await admin.from("quotes").update({ viewed_at: new Date().toISOString() }).eq("id", q.id).is("viewed_at", null);
}

export async function respondToQuote(
  token: string, answer: "accept" | "decline", name?: string
): Promise<{ ok: boolean; message: string }> {
  if (!UUID_RE.test(token)) return { ok: false, message: "Quote not found." };
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("*").eq("public_token", token).maybeSingle();
  if (!q || q.status === "draft") return { ok: false, message: "Quote not found." };
  if (await isOwner(q.tenant_id)) return { ok: false, message: "This is your own quote. Your client accepts it from their link." };
  if (q.status === "accepted" || q.status === "converted") return { ok: true, message: "This quote has already been accepted." };
  if (q.status === "declined") return { ok: false, message: "This quote was declined. Reply to the email if you've changed your mind." };
  const today = new Date().toISOString().slice(0, 10);
  if (answer === "accept" && q.valid_until && q.valid_until < today) {
    return { ok: false, message: "This quote has expired. Please contact the sender for an updated quote." };
  }

  const now = new Date().toISOString();
  const status = answer === "accept" ? "accepted" : "declined";
  const { data: updated } = await admin.from("quotes")
    .update({ status, accepted_at: answer === "accept" ? now : null, declined_at: answer === "decline" ? now : null })
    .eq("id", q.id).in("status", ["sent"]).select("id");
  if (!updated || updated.length === 0) return { ok: false, message: "This quote can no longer be changed." };

  // Let the business owner know.
  try {
    const { data: tenant } = await admin.from("tenants").select("name, email, currency").eq("id", q.tenant_id).maybeSingle();
    const { data: client } = q.client_id
      ? await admin.from("clients").select("name").eq("id", q.client_id).maybeSingle()
      : { data: null };
    const key = process.env.RESEND_API_KEY;
    if (key && tenant?.email) {
      const who = (name || "").trim().slice(0, 80) || client?.name || "Your client";
      const amt = money(q.total, tenant.currency || "ZAR");
      const accepted = answer === "accept";
      await new Resend(key).emails.send({
        from: "Zarbill <" + (process.env.INVOICE_FROM_EMAIL || "invoices@zarbill.com") + ">",
        to: tenant.email,
        subject: (accepted ? "Quote accepted: " : "Quote declined: ") + q.number + " (" + amt + ")",
        html:
          '<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">' +
          "<h2>" + (accepted ? "Good news: your quote was accepted" : "Your quote was declined") + "</h2>" +
          "<p><strong>" + esc(who) + "</strong> " + (accepted ? "accepted" : "declined") + " quote <strong>" + esc(q.number) +
          "</strong> for <strong>" + esc(amt) + "</strong>.</p>" +
          (accepted
            ? '<p>Turn it into an invoice in one click, with nothing to retype:</p><p><a href="' + SITE_URL +
              '/app/quotes" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">Open your quotes</a></p>'
            : "<p>You might want to follow up and ask what would work better for them.</p>") +
          '<p style="font-size:11px;color:#aaa;margin-top:24px">Zarbill</p></div>',
      });
    }
  } catch { /* notification is best-effort */ }

  return {
    ok: true,
    message: answer === "accept"
      ? "Thank you! The quote is accepted and the sender has been notified."
      : "Thanks for letting us know. The sender has been notified.",
  };
}

/** Used by the page to decide whether to show a draft (owner preview only). */
export async function viewerIsOwner(tenantId: string): Promise<boolean> {
  return isOwner(tenantId);
}

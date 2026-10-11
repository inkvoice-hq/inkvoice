// lib/recurring.ts
// -----------------------------------------------------------------------------
// Two daily jobs (run from /api/cron/daily, service-role client):
//
//  runScheduledSends  — invoices with "Email to client on <date>" set: send
//                       them on that date.
//  runRecurring       — invoices marked weekly / monthly / quarterly / yearly:
//                       on each recur_next_date, create the next copy with the
//                       next invoice number and (optionally) email it.
//
// Both "claim" their work with a conditional update first, so a cron that
// fires twice can never create or send anything twice.
// -----------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverInvoiceEmail } from "@/lib/email/invoice-core";
import { addInterval, daysBetween, addDaysISO } from "@/lib/format";
import { atLimit } from "@/lib/plans";

type Log = { invoice: string; detail: string };
export type JobResult = { dryRun: boolean; done: Log[]; wouldDo: Log[]; skipped: Log[]; errors: Log[] };

const newResult = (dryRun: boolean): JobResult => ({ dryRun, done: [], wouldDo: [], skipped: [], errors: [] });
const todayUTC = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
export async function runScheduledSends({ dryRun = false } = {}): Promise<JobResult> {
  const r = newResult(dryRun);
  const admin = createAdminClient();
  const { data, error } = await admin.from("invoices")
    .select("id, tenant_id, number, scheduled_send_date")
    .not("scheduled_send_date", "is", null)
    .lte("scheduled_send_date", todayUTC())
    .is("sent_at", null)
    .in("status", ["draft", "unpaid"])
    .limit(200);
  if (error) throw new Error("Scheduled sends: " + error.message);

  for (const inv of data ?? []) {
    if (dryRun) { r.wouldDo.push({ invoice: inv.number, detail: "send (scheduled " + inv.scheduled_send_date + ")" }); continue; }

    // Claim: clear the date so a second run can't send it again.
    const { data: claimed } = await admin.from("invoices")
      .update({ scheduled_send_date: null })
      .eq("id", inv.id).eq("scheduled_send_date", inv.scheduled_send_date).select("id");
    if (!claimed?.length) continue;

    const res = await deliverInvoiceEmail(admin, inv.tenant_id, inv.id);
    if (res.ok) r.done.push({ invoice: inv.number, detail: res.message });
    else {
      // Put the date back for retry unless it can never succeed.
      if (!/no email address/i.test(res.message)) {
        await admin.from("invoices").update({ scheduled_send_date: inv.scheduled_send_date }).eq("id", inv.id);
      }
      r.errors.push({ invoice: inv.number, detail: res.message });
    }
    await new Promise((x) => setTimeout(x, 600));
  }
  return r;
}

// ---------------------------------------------------------------------------
async function claimInvoiceNumber(admin: SupabaseClient, tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: t } = await admin.from("tenants").select("next_invoice_number").eq("id", tenantId).maybeSingle();
    const n = t?.next_invoice_number ?? 1001;
    const { data: bumped } = await admin.from("tenants")
      .update({ next_invoice_number: n + 1 })
      .eq("id", tenantId).eq("next_invoice_number", n).select("id");
    if (!bumped?.length) continue; // someone else took it; retry
    const number = "INV-" + n;
    const { count } = await admin.from("invoices")
      .select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("number", number);
    if (!count) return number; // free to use
  }
  throw new Error("Could not allocate an invoice number");
}

function nextAfter(anchor: string, recurring: string, after: string): string {
  for (let k = 1; k < 3000; k++) {
    const d = addInterval(anchor, recurring, k);
    if (d > after) return d;
  }
  return addInterval(after, recurring, 1);
}

export async function runRecurring({ dryRun = false } = {}): Promise<JobResult> {
  const r = newResult(dryRun);
  const admin = createAdminClient();
  const today = todayUTC();

  const { data: templates, error } = await admin.from("invoices")
    .select("*")
    .in("recurring", ["weekly", "monthly", "quarterly", "annually"])
    .not("recur_next_date", "is", null)
    .lte("recur_next_date", today)
    .in("status", ["unpaid", "paid"])
    .limit(200);
  if (error) throw new Error("Recurring: " + error.message);

  for (const t of templates ?? []) {
    const issue = t.recur_next_date as string;
    const anchor = (t.issue_date || issue) as string;
    const following = nextAfter(anchor, t.recurring, today > issue ? today : issue);

    const { data: tenant } = await admin.from("tenants").select("plan, payment_terms").eq("id", t.tenant_id).maybeSingle();
    const { count } = await admin.from("invoices").select("id", { count: "exact", head: true }).eq("tenant_id", t.tenant_id);
    if (atLimit(tenant?.plan, "invoices", count ?? 0)) {
      r.skipped.push({ invoice: t.number, detail: "free plan invoice limit reached" });
      continue;
    }

    if (dryRun) {
      r.wouldDo.push({ invoice: t.number, detail: "create copy dated " + issue + (t.recur_auto_send ? " and email it" : " as draft") + "; next " + following });
      continue;
    }

    // Claim this occurrence by moving the schedule forward first.
    const { data: claimed } = await admin.from("invoices")
      .update({ recur_next_date: following })
      .eq("id", t.id).eq("recur_next_date", issue).select("id");
    if (!claimed?.length) continue;

    try {
      const termDays = t.issue_date && t.due_date ? Math.max(0, daysBetween(t.issue_date, t.due_date)) : (tenant?.payment_terms ?? 30);
      const number = await claimInvoiceNumber(admin, t.tenant_id);
      const { data: copy, error: insErr } = await admin.from("invoices").insert({
        tenant_id: t.tenant_id,
        client_id: t.client_id,
        number,
        issue_date: issue,
        due_date: addDaysISO(termDays, issue),
        description: t.description,
        status: "draft",
        tax_rate: t.tax_rate,
        discount: t.discount,
        notes: t.notes,
        items: t.items,
        subtotal: t.subtotal,
        total: t.total,
        recurring: null,
        recur_parent_id: t.id,
      }).select("id, number").single();
      if (insErr || !copy) throw new Error(insErr?.message || "insert failed");

      if (t.recur_auto_send) {
        const sent = await deliverInvoiceEmail(admin, t.tenant_id, copy.id);
        if (!sent.ok) {
          // Still a valid invoice; mark it unpaid so it shows as owed.
          await admin.from("invoices").update({ status: "unpaid" }).eq("id", copy.id);
          r.errors.push({ invoice: copy.number, detail: "created, but email failed: " + sent.message });
        } else {
          r.done.push({ invoice: copy.number, detail: "created from " + t.number + " and emailed" });
        }
        await new Promise((x) => setTimeout(x, 600));
      } else {
        r.done.push({ invoice: copy.number, detail: "created from " + t.number + " as a draft" });
      }
    } catch (e: any) {
      await admin.from("invoices").update({ recur_next_date: issue }).eq("id", t.id); // retry tomorrow
      r.errors.push({ invoice: t.number, detail: e?.message || "failed" });
    }
  }
  return r;
}

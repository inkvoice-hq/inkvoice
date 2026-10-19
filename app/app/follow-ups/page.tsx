// app/app/follow-ups/page.tsx — who to chase, why, and a Claude-drafted email to do it.
import type { Metadata } from "next";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { balanceDue, curOf, daysBetween, todayISO } from "@/lib/format";
import { aiDraftLimit } from "@/lib/plans";
import { clientProfiles, profileFor, nextStep, type InvoiceRow } from "@/lib/insights";
import { FollowUpsView, type FollowUpRow } from "./FollowUpsView";

export const metadata: Metadata = { title: "Follow-ups" };

export default async function FollowUpsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  const [{ data: tenant }, { data: inv }, { data: clients }, { count: used }, { data: sent }] = await Promise.all([
    supabase.from("tenants").select("currency, plan").eq("id", tenantId).maybeSingle(),
    supabase.from("invoices")
      .select("id, number, client_id, status, issue_date, due_date, paid_date, total, amount_paid, currency, fx_rate, recurring, recur_next_date, viewed_at, reminders_sent, sent_at, last_reminder_at, disputed_at, dispute_note")
      .eq("tenant_id", tenantId),
    supabase.from("clients").select("id, name, email").eq("tenant_id", tenantId),
    supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", monthStart),
    supabase.from("ai_drafts").select("invoice_id, sent_at").eq("tenant_id", tenantId).eq("status", "sent").order("sent_at", { ascending: false }),
  ]);

  const home = tenant?.currency || "ZAR";
  const today = todayISO();
  const invoices = (inv ?? []) as (InvoiceRow & { last_reminder_at: string | null })[];
  const profiles = clientProfiles(invoices);
  const cmap = new Map((clients ?? []).map((c: any) => [c.id, c]));
  const lastPersonal = new Map<string, string>();
  for (const d of sent ?? []) if (!lastPersonal.has(d.invoice_id)) lastPersonal.set(d.invoice_id, d.sent_at);

  const rows: FollowUpRow[] = invoices
    .filter((i) => i.status !== "draft" && i.status !== "paid" && balanceDue(i) > 0 && i.due_date && daysBetween(today, i.due_date) <= 7)
    .map((i) => {
      const p = profileFor(profiles, i.client_id);
      const step = nextStep(i, p, today);
      const c: any = i.client_id ? cmap.get(i.client_id) : null;
      return {
        id: i.id, number: i.number, client: c?.name || "—", hasEmail: !!c?.email,
        balance: balanceDue(i), currency: curOf(i, home), dueDate: i.due_date!,
        overdueDays: daysBetween(i.due_date!, today), viewed: !!i.viewed_at, sentByZarbill: !!i.sent_at || !!i.last_reminder_at,
        reminders: i.last_reminder_at ? i.reminders_sent || 0 : 0, partial: Number(i.amount_paid) > 0,
        payer: p.summary, payerLabel: p.label,
        step, lastPersonal: lastPersonal.get(i.id) ?? null,
      };
    })
    .sort((a, b) => b.step.priority - a.step.priority || b.overdueDays - a.overdueDays);

  return (
    <FollowUpsView
      rows={rows}
      usage={{ used: used ?? 0, limit: aiDraftLimit(tenant?.plan), enabled: !!process.env.ANTHROPIC_API_KEY }}
    />
  );
}

// lib/db/ledger.ts
// -----------------------------------------------------------------------------
// The single place that decides an invoice's paid status from its payments.
//
//   amount_paid = sum(payments)
//   fully covered          -> status "paid", paid_date = latest payment date
//   partly covered / none  -> "unpaid" (a draft with no payments stays draft)
//
// Every code path that adds, removes or changes payments — or changes an
// invoice total — calls recalcInvoice() afterwards, so the numbers on the
// dashboard, invoice list, hosted page and reminder emails always agree.
// Plain module (not "use server"): only called from trusted server code.
// -----------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import { round2 } from "@/lib/format";

export async function recalcInvoice(supabase: SupabaseClient, tenantId: string, invoiceId: string): Promise<void> {
  const [{ data: inv }, { data: pays }] = await Promise.all([
    supabase.from("invoices").select("id, status, total").eq("tenant_id", tenantId).eq("id", invoiceId).maybeSingle(),
    supabase.from("payments").select("amount, paid_on").eq("tenant_id", tenantId).eq("invoice_id", invoiceId),
  ]);
  if (!inv) return;

  const paid = round2((pays ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0));
  const total = round2(Number(inv.total || 0));
  const lastDate = (pays ?? []).map((p: any) => String(p.paid_on)).sort().pop() ?? null;

  let status = inv.status as string;
  let paid_date: string | null = null;
  if (total > 0 && paid >= total) {
    status = "paid";
    paid_date = lastDate;
  } else if (status === "paid" || (status === "draft" && paid > 0)) {
    status = "unpaid";
  }
  if (status === "paid" && !paid_date) paid_date = new Date().toISOString().slice(0, 10);

  await supabase.from("invoices")
    .update({ amount_paid: paid, status, paid_date: status === "paid" ? paid_date : null })
    .eq("tenant_id", tenantId).eq("id", invoiceId);
}

/** Records a payment for whatever is still owed (used by "Mark paid"). */
export async function payRemainingBalance(
  supabase: SupabaseClient, tenantId: string, invoiceId: string, paidOn?: string | null, method = "Marked paid"
): Promise<void> {
  const [{ data: inv }, { data: pays }] = await Promise.all([
    supabase.from("invoices").select("total").eq("tenant_id", tenantId).eq("id", invoiceId).maybeSingle(),
    supabase.from("payments").select("amount").eq("tenant_id", tenantId).eq("invoice_id", invoiceId),
  ]);
  if (!inv) return;
  const paid = (pays ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
  const remaining = round2(Number(inv.total || 0) - paid);
  if (remaining > 0) {
    const { error } = await supabase.from("payments").insert({
      tenant_id: tenantId, invoice_id: invoiceId, amount: remaining,
      paid_on: paidOn || new Date().toISOString().slice(0, 10), method, note: null,
    });
    if (error) throw new Error(error.message);
  }
  await recalcInvoice(supabase, tenantId, invoiceId);
}

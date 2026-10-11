"use server";
import { attempt, type Result } from "@/lib/result";
// lib/db/payments.ts — record, list and remove payments against an invoice.

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { recalcInvoice } from "@/lib/db/ledger";
import { round2 } from "@/lib/format";
import type { Payment, PaymentInput } from "@/lib/db/types";

export async function listPayments(invoiceId: string): Promise<Payment[]> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments").select("*")
    .eq("tenant_id", tenantId).eq("invoice_id", invoiceId)
    .order("paid_on", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

async function recordPaymentImpl(input: PaymentInput): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error("Enter an amount greater than zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paid_on || "")) throw new Error("Choose the date the payment was received.");

  const { data: inv } = await supabase
    .from("invoices").select("id, total, amount_paid, status")
    .eq("tenant_id", tenantId).eq("id", input.invoice_id).maybeSingle();
  if (!inv) throw new Error("Invoice not found.");

  const remaining = round2(Number(inv.total) - Number(inv.amount_paid || 0));
  if (amount > remaining + 0.001) {
    throw new Error("That's more than the balance due (" + remaining.toFixed(2) + ").");
  }

  const { error } = await supabase.from("payments").insert({
    tenant_id: tenantId, invoice_id: inv.id, amount, paid_on: input.paid_on,
    method: (input.method || "").trim().slice(0, 60) || null,
    note: (input.note || "").trim().slice(0, 300) || null,
  });
  if (error) throw new Error(error.message);
  await recalcInvoice(supabase, tenantId, inv.id);
}

async function deletePaymentImpl(paymentId: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: pay } = await supabase
    .from("payments").select("invoice_id").eq("tenant_id", tenantId).eq("id", paymentId).maybeSingle();
  if (!pay) return;
  const { error } = await supabase.from("payments").delete().eq("tenant_id", tenantId).eq("id", paymentId);
  if (error) throw new Error(error.message);
  await recalcInvoice(supabase, tenantId, pay.invoice_id);
}

// ---- Actions called from the browser (errors returned, not thrown) ----
export async function recordPayment(input: PaymentInput): Promise<Result<void>> {
  return attempt(() => recordPaymentImpl(input));
}

export async function deletePayment(paymentId: string): Promise<Result<void>> {
  return attempt(() => deletePaymentImpl(paymentId));
}

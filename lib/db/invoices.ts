"use server";
import { attempt, type Result } from "@/lib/result";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { assertCanCreate } from "@/lib/db/guard";
import { round2, addInterval, todayISO } from "@/lib/format";
import { computeTotals } from "@/lib/totals";
import { recalcInvoice, payRemainingBalance } from "@/lib/db/ledger";
import type { Invoice, InvoiceFormInput } from "@/lib/db/types";


const RECURRING_OK = ["weekly", "monthly", "quarterly", "annually"];

/** First date in the series (anchor + k intervals) that falls after `after`. */
function nextOccurrence(anchor: string | null, recurring: string | null, after = todayISO()): string | null {
  if (!anchor || !recurring || !RECURRING_OK.includes(recurring)) return null;
  for (let k = 1; k < 2000; k++) {
    const d = addInterval(anchor, recurring, k);
    if (d > after) return d;
  }
  return null;
}

function cleanDate(d: string | null | undefined): string | null {
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export async function listInvoices(): Promise<Invoice[]> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("issue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Invoice) ?? null;
}

export async function nextInvoiceNumber(): Promise<string> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("next_invoice_number")
    .eq("id", tenantId)
    .maybeSingle();
  const n = data?.next_invoice_number ?? 1001;
  return `INV-${n}`;
}

async function createInvoice_Impl(input: InvoiceFormInput): Promise<Invoice> {
  await assertCanCreate("invoices");
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { items, subtotal, total } = computeTotals(input.items, input.tax_rate, input.discount);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenantId,
      client_id: input.client_id || null,
      number: input.number.trim(),
      issue_date: input.issue_date || null,
      due_date: input.due_date || null,
      paid_date: input.status === "paid" ? (input.paid_date || input.issue_date) : null,
      description: input.description || null,
      status: input.status,
      tax_rate: Number(input.tax_rate) || 0,
      discount: round2(Number(input.discount) || 0),
      notes: input.notes || null,
      recurring: input.recurring || null,
      recur_next_date: nextOccurrence(input.issue_date, input.recurring),
      recur_auto_send: input.recur_auto_send !== false,
      scheduled_send_date: input.status === "paid" ? null : cleanDate(input.scheduled_send_date),
      items,
      subtotal,
      total,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error(`Invoice number "${input.number}" already exists.`);
    throw new Error(error.message);
  }

  if (input.status === "paid") {
    await payRemainingBalance(supabase, tenantId, data.id, input.paid_date || input.issue_date);
  }

  const match = input.number.trim().match(/(\d+)\s*$/);
  if (match) {
    const used = parseInt(match[1], 10);
    const { data: t } = await supabase
      .from("tenants").select("next_invoice_number").eq("id", tenantId).maybeSingle();
    if (t && used >= (t.next_invoice_number ?? 0)) {
      await supabase.from("tenants")
        .update({ next_invoice_number: used + 1 })
        .eq("id", tenantId);
    }
  }

  return data as Invoice;
}

async function updateInvoiceImpl(id: string, input: InvoiceFormInput): Promise<Invoice> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { items, subtotal, total } = computeTotals(input.items, input.tax_rate, input.discount);

  const { data: before } = await supabase
    .from("invoices").select("status, recurring, issue_date, recur_next_date")
    .eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (!before) throw new Error("Invoice not found.");

  // Un-marking a paid invoice removes the quick "Marked paid" entries.
  // Real recorded payments stay; remove those from the Payments panel.
  if (before.status === "paid" && input.status !== "paid") {
    await supabase.from("payments").delete()
      .eq("tenant_id", tenantId).eq("invoice_id", id).in("method", ["Marked paid", "Recorded"]);
  }

  const recurringChanged = (before.recurring || "") !== (input.recurring || "") || before.issue_date !== (input.issue_date || null);
  const recur_next_date = !input.recurring
    ? null
    : recurringChanged || !before.recur_next_date
      ? nextOccurrence(input.issue_date, input.recurring)
      : before.recur_next_date;

  const { data, error } = await supabase
    .from("invoices")
    .update({
      client_id: input.client_id || null,
      number: input.number.trim(),
      issue_date: input.issue_date || null,
      due_date: input.due_date || null,
      paid_date: input.status === "paid" ? (input.paid_date || input.issue_date) : null,
      description: input.description || null,
      status: input.status,
      tax_rate: Number(input.tax_rate) || 0,
      discount: round2(Number(input.discount) || 0),
      notes: input.notes || null,
      recurring: input.recurring || null,
      recur_next_date,
      recur_auto_send: input.recur_auto_send !== false,
      scheduled_send_date: input.status === "paid" ? null : cleanDate(input.scheduled_send_date),
      items,
      subtotal,
      total,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error(`Invoice number "${input.number}" already exists.`);
    throw new Error(error.message);
  }

  if (input.status === "paid") await payRemainingBalance(supabase, tenantId, id, input.paid_date || todayISO());
  else await recalcInvoice(supabase, tenantId, id);
  return data as Invoice;
}

async function markInvoicePaidImpl(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  await payRemainingBalance(supabase, tenantId, id);
}

async function deleteInvoiceImpl(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Actions called from the browser (errors returned, not thrown) ----
export async function createInvoice_(input: InvoiceFormInput): Promise<Result<Invoice>> {
  return attempt(() => createInvoice_Impl(input));
}

export async function updateInvoice(id: string, input: InvoiceFormInput): Promise<Result<Invoice>> {
  return attempt(() => updateInvoiceImpl(id, input));
}

export async function markInvoicePaid(id: string): Promise<Result<void>> {
  return attempt(() => markInvoicePaidImpl(id));
}

export async function deleteInvoice(id: string): Promise<Result<void>> {
  return attempt(() => deleteInvoiceImpl(id));
}

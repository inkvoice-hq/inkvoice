"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { assertCanCreate } from "@/lib/db/guard";
import { round2 } from "@/lib/format";
import type { Invoice, InvoiceItem, InvoiceFormInput } from "@/lib/db/types";

function computeTotals(items: InvoiceItem[], taxRate: number, discount: number) {
  const clean: InvoiceItem[] = (items ?? [])
    .filter((i) => (i?.desc ?? "").trim() !== "" || Number(i?.qty) || Number(i?.rate))
    .map((i) => {
      const qty = round2(Number(i.qty) || 0);
      const rate = round2(Number(i.rate) || 0);
      return { desc: String(i.desc ?? ""), qty, rate, total: round2(qty * rate) };
    });

  const subtotal = round2(clean.reduce((s, i) => s + i.total, 0));
  const tax = round2(subtotal * ((Number(taxRate) || 0) / 100));
  const disc = round2(Number(discount) || 0);
  const total = round2(Math.max(0, subtotal + tax - disc));

  return { items: clean, subtotal, total };
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

export async function createInvoice_(input: InvoiceFormInput): Promise<Invoice> {
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

export async function updateInvoice(id: string, input: InvoiceFormInput): Promise<Invoice> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { items, subtotal, total } = computeTotals(input.items, input.tax_rate, input.discount);

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
  return data as Invoice;
}

export async function markInvoicePaid(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_date: new Date().toISOString().slice(0, 10) })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

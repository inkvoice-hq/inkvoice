"use server";
import { attempt, unwrap, type Result } from "@/lib/result";
// lib/db/quotes.ts
// -----------------------------------------------------------------------------
// Quotes (a.k.a. estimates). Same line items and totals as invoices, with
// their own numbering (QUO-1001). A quote turns into an invoice in one click:
// every line, the client, tax, discount and notes are copied across.
// -----------------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { computeTotals } from "@/lib/totals";
import { round2, todayISO, addDaysISO } from "@/lib/format";
import { createInvoice_, nextInvoiceNumber } from "@/lib/db/invoices";
import type { Quote, QuoteFormInput, QuoteStatus } from "@/lib/db/types";

export async function listQuotes(): Promise<Quote[]> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes").select("*")
    .eq("tenant_id", tenantId)
    .order("issue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Quote[];
}

export async function nextQuoteNumber(): Promise<string> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("next_quote_number").eq("id", tenantId).maybeSingle();
  return `QUO-${data?.next_quote_number ?? 1001}`;
}

function row(input: QuoteFormInput) {
  const { items, subtotal, total } = computeTotals(input.items, input.tax_rate, input.discount);
  return {
    client_id: input.client_id || null,
    number: input.number.trim(),
    issue_date: input.issue_date || null,
    valid_until: input.valid_until || null,
    description: input.description || null,
    tax_rate: Number(input.tax_rate) || 0,
    discount: round2(Number(input.discount) || 0),
    notes: input.notes || null,
    items, subtotal, total,
  };
}

async function createQuoteImpl(input: QuoteFormInput): Promise<Quote> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes").insert({ ...row(input), tenant_id: tenantId, status: "draft" })
    .select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error(`Quote number "${input.number}" already exists.`);
    throw new Error(error.message);
  }

  const m = input.number.trim().match(/(\d+)\s*$/);
  if (m) {
    const used = parseInt(m[1], 10);
    const { data: t } = await supabase.from("tenants").select("next_quote_number").eq("id", tenantId).maybeSingle();
    if (t && used >= (t.next_quote_number ?? 0)) {
      await supabase.from("tenants").update({ next_quote_number: used + 1 }).eq("id", tenantId);
    }
  }
  return data as Quote;
}

async function updateQuoteImpl(id: string, input: QuoteFormInput): Promise<Quote> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: before } = await supabase.from("quotes").select("status").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (!before) throw new Error("Quote not found.");
  if (before.status === "converted") throw new Error("This quote is already an invoice. Edit the invoice instead.");

  const { data, error } = await supabase
    .from("quotes").update(row(input))
    .eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error(`Quote number "${input.number}" already exists.`);
    throw new Error(error.message);
  }
  return data as Quote;
}

async function deleteQuoteImpl(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Manually mark a quote accepted / declined (e.g. the client said yes on the phone). */
async function setQuoteStatusImpl(id: string, status: QuoteStatus): Promise<void> {
  if (!["draft", "sent", "accepted", "declined"].includes(status)) throw new Error("Invalid status.");
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("quotes").update({
    status,
    accepted_at: status === "accepted" ? now : null,
    declined_at: status === "declined" ? now : null,
  }).eq("tenant_id", tenantId).eq("id", id).neq("status", "converted");
  if (error) throw new Error(error.message);
}

/** Creates a draft invoice from the quote. Nothing is retyped. */
async function convertQuoteToInvoiceImpl(id: string): Promise<{ invoiceId: string; number: string }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: q } = await supabase.from("quotes").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (!q) throw new Error("Quote not found.");
  if (q.status === "converted" && q.converted_invoice_id) {
    throw new Error("This quote has already been turned into an invoice.");
  }

  const { data: t } = await supabase.from("tenants").select("payment_terms, invoice_notes").eq("id", tenantId).maybeSingle();
  const issue = todayISO();

  const inv = unwrap(await createInvoice_({
    client_id: q.client_id,
    number: await nextInvoiceNumber(),
    issue_date: issue,
    due_date: addDaysISO(t?.payment_terms ?? 30, issue),
    paid_date: null,
    description: q.description || ("Quote " + q.number),
    status: "draft",
    tax_rate: Number(q.tax_rate) || 0,
    discount: Number(q.discount) || 0,
    notes: q.notes || t?.invoice_notes || null,
    recurring: null,
    items: q.items ?? [],
  }));

  await Promise.all([
    supabase.from("invoices").update({ quote_id: q.id }).eq("tenant_id", tenantId).eq("id", inv.id),
    supabase.from("quotes").update({
      status: "converted", converted_invoice_id: inv.id,
      accepted_at: q.accepted_at || new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("id", q.id),
  ]);

  return { invoiceId: inv.id, number: inv.number };
}

// ---- Actions called from the browser (errors returned, not thrown) ----
export async function createQuote(input: QuoteFormInput): Promise<Result<Quote>> {
  return attempt(() => createQuoteImpl(input));
}

export async function updateQuote(id: string, input: QuoteFormInput): Promise<Result<Quote>> {
  return attempt(() => updateQuoteImpl(id, input));
}

export async function deleteQuote(id: string): Promise<Result<void>> {
  return attempt(() => deleteQuoteImpl(id));
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<Result<void>> {
  return attempt(() => setQuoteStatusImpl(id, status));
}

export async function convertQuoteToInvoice(id: string): Promise<Result<{ invoiceId: string; number: string }>> {
  return attempt(() => convertQuoteToInvoiceImpl(id));
}

"use server";
// lib/db/import-draft.ts
// -----------------------------------------------------------------------------
// Turns an invoice made in the free generator (kept in the visitor's browser)
// into real data in their new account: fills in empty business details,
// finds-or-creates the client, and saves the invoice as a draft.
// -----------------------------------------------------------------------------
import { unwrap } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { atLimit } from "@/lib/plans";
import { createInvoice_, nextInvoiceNumber } from "@/lib/db/invoices";
import { CURRENCY_SYMBOLS, todayISO, addDaysISO } from "@/lib/format";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e9) : 0;
};
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function importGeneratorDraft(raw: unknown): Promise<{
  ok: boolean; invoiceId?: string; number?: string; message?: string;
}> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;

  const from = d.from ?? {}, to = d.to ?? {};
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 50)
    .map((i: any) => ({ desc: str(i?.desc, 300), qty: num(i?.qty), rate: num(i?.rate), total: 0 }))
    .filter((i: any) => i.desc || i.rate);
  if (items.length === 0 && !str(to.name)) return { ok: false, message: "Nothing to import." };

  // 1. Business details: only fill what is still empty / default.
  const { data: tenant } = await supabase
    .from("tenants").select("name, email, address, tax_reg, currency, invoice_notes, plan")
    .eq("id", tenantId).maybeSingle();
  const { count: invCount } = await supabase
    .from("invoices").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);

  const patch: Record<string, any> = {};
  if (str(from.name) && (!tenant?.name || tenant.name === "My Business")) patch.name = str(from.name, 120);
  if (str(from.email) && !tenant?.email) patch.email = str(from.email, 200);
  if (str(from.address, 500) && !tenant?.address) patch.address = str(from.address, 500);
  if (str(from.vat) && !tenant?.tax_reg) patch.tax_reg = str(from.vat, 60);
  if (str(d.notes, 1000) && !tenant?.invoice_notes) patch.invoice_notes = str(d.notes, 1000);
  if (CURRENCY_SYMBOLS[str(d.cur)] && (invCount ?? 0) === 0) patch.currency = str(d.cur);
  if (Object.keys(patch).length) await supabase.from("tenants").update(patch).eq("id", tenantId);

  // 2. Client: reuse a matching one, otherwise create (if the plan allows).
  let clientId: string | null = null;
  const cName = str(to.name, 200), cEmail = str(to.email, 200);
  if (cName || cEmail) {
    const { data: existing } = await supabase.from("clients").select("id, name, email").eq("tenant_id", tenantId);
    const match = (existing ?? []).find((c: any) =>
      (cEmail && (c.email || "").toLowerCase() === cEmail.toLowerCase()) ||
      (cName && (c.name || "").toLowerCase() === cName.toLowerCase()));
    if (match) clientId = match.id;
    else if (!atLimit(tenant?.plan, "clients", (existing ?? []).length)) {
      const { data: created } = await supabase.from("clients")
        .insert({ tenant_id: tenantId, name: cName || cEmail, email: cEmail || null, address: str(to.address, 500) || null })
        .select("id").single();
      clientId = created?.id ?? null;
    }
  }

  // 3. The invoice itself, as a draft.
  const issue = date(d.issued) ?? todayISO();
  const input = {
    client_id: clientId,
    currency: CURRENCY_SYMBOLS[str(d.cur)] ? str(d.cur) : null,
    number: str(d.num, 40) || (await nextInvoiceNumber()),
    issue_date: issue,
    due_date: date(d.due) ?? addDaysISO(30, issue),
    paid_date: null,
    description: null,
    status: "draft",
    tax_rate: Math.min(num(d.taxRate), 100),
    discount: 0,
    notes: str(d.notes, 1000) || null,
    recurring: null,
    items: items.length ? items : [{ desc: "Services", qty: 1, rate: 0, total: 0 }],
  };

  try {
    const inv = unwrap(await createInvoice_(input));
    return { ok: true, invoiceId: inv.id, number: inv.number };
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("already exists")) {
      const inv = unwrap(await createInvoice_({ ...input, number: await nextInvoiceNumber() }));
      return { ok: true, invoiceId: inv.id, number: inv.number };
    }
    return { ok: false, message: msg || "Could not import your invoice." };
  }
}

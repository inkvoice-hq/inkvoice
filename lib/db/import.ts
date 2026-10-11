"use server";
// lib/db/import.ts
// -----------------------------------------------------------------------------
// CSV imports for people switching from another tool. The browser parses the
// file and maps columns; these actions validate everything again, skip
// duplicates, respect plan limits, and insert in bulk.
// -----------------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { planLimits, isUnlimited } from "@/lib/plans";
import { round2 } from "@/lib/format";

export type ImportClientRow = {
  name?: string; contact?: string; email?: string; phone?: string; address?: string;
  tax_id?: string; website?: string; notes?: string;
};
export type ImportInvoiceRow = {
  number?: string; client?: string; client_email?: string; issue_date?: string | null; due_date?: string | null;
  total?: number | null; amount_paid?: number | null; status?: string; paid_date?: string | null; description?: string;
};
export type ImportResult = { created: number; skipped: number; limited: number; messages: string[] };

const s = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const d = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? round2(Math.min(x, 1e10)) : null; };
const key = (v: string) => v.trim().toLowerCase();

async function ctx() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("plan, next_invoice_number").eq("id", tenantId).maybeSingle();
  return { tenantId, supabase, tenant };
}

export async function importClients(rows: ImportClientRow[]): Promise<ImportResult> {
  const { tenantId, supabase, tenant } = await ctx();
  const res: ImportResult = { created: 0, skipped: 0, limited: 0, messages: [] };

  const { data: existing } = await supabase.from("clients").select("name, email").eq("tenant_id", tenantId);
  const seen = new Set<string>();
  for (const c of existing ?? []) { if (c.email) seen.add("e:" + key(c.email)); seen.add("n:" + key(c.name)); }

  const max = planLimits(tenant?.plan).maxClients;
  let room = isUnlimited(max) ? Infinity : Math.max(0, max - (existing ?? []).length);

  const toInsert: any[] = [];
  for (const r of (rows ?? []).slice(0, 5000)) {
    const name = s(r.name, 200) || s(r.contact, 200) || s(r.email, 200);
    if (!name) { res.skipped++; continue; }
    const email = s(r.email, 200);
    if ((email && seen.has("e:" + key(email))) || seen.has("n:" + key(name))) { res.skipped++; continue; }
    if (room <= 0) { res.limited++; continue; }
    seen.add("n:" + key(name)); if (email) seen.add("e:" + key(email));
    room--;
    toInsert.push({
      tenant_id: tenantId, name, contact: s(r.contact, 200) || null, email: email || null,
      phone: s(r.phone, 60) || null, address: s(r.address, 500) || null, tax_id: s(r.tax_id, 60) || null,
      website: s(r.website, 200) || null, notes: s(r.notes, 1000) || null,
    });
  }

  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from("clients").insert(toInsert.slice(i, i + 500));
    if (error) { res.messages.push(error.message); break; }
    res.created += Math.min(500, toInsert.length - i);
  }
  if (res.limited) res.messages.push(`${res.limited} not imported: the Free plan holds ${max} clients. Upgrade to Pro for unlimited.`);
  return res;
}

function mapStatus(raw: string, total: number, paid: number): "draft" | "unpaid" | "paid" {
  const v = key(raw);
  if (total > 0 && paid >= total) return "paid";
  if (/^(paid|closed|complete|completed|settled|fully paid)$/.test(v)) return "paid";
  if (/^(draft|not sent|unsent)$/.test(v)) return "draft";
  return "unpaid";
}

export async function importInvoices(rows: ImportInvoiceRow[], opts: { remind?: boolean } = {}): Promise<ImportResult> {
  const { tenantId, supabase, tenant } = await ctx();
  const res: ImportResult = { created: 0, skipped: 0, limited: 0, messages: [] };

  const [{ data: existingInv }, { data: existingClients }] = await Promise.all([
    supabase.from("invoices").select("number").eq("tenant_id", tenantId),
    supabase.from("clients").select("id, name, email").eq("tenant_id", tenantId),
  ]);
  const numbers = new Set((existingInv ?? []).map((i: any) => key(i.number)));
  const clientsByKey = new Map<string, string>();
  for (const c of existingClients ?? []) {
    clientsByKey.set("n:" + key(c.name), c.id);
    if (c.email) clientsByKey.set("e:" + key(c.email), c.id);
  }

  const limits = planLimits(tenant?.plan);
  let invRoom = isUnlimited(limits.maxInvoices) ? Infinity : Math.max(0, limits.maxInvoices - (existingInv ?? []).length);
  let clientRoom = isUnlimited(limits.maxClients) ? Infinity : Math.max(0, limits.maxClients - (existingClients ?? []).length);
  let clientsCreated = 0, noClient = 0;

  async function clientIdFor(name: string, email: string): Promise<string | null> {
    const hit = (email && clientsByKey.get("e:" + key(email))) || (name && clientsByKey.get("n:" + key(name)));
    if (hit) return hit;
    if (!name && !email) return null;
    if (clientRoom <= 0) { noClient++; return null; }
    const { data, error } = await supabase.from("clients")
      .insert({ tenant_id: tenantId, name: name || email, email: email || null }).select("id").single();
    if (error || !data) return null;
    clientRoom--; clientsCreated++;
    clientsByKey.set("n:" + key(name || email), data.id);
    if (email) clientsByKey.set("e:" + key(email), data.id);
    return data.id;
  }

  const invRows: any[] = [];
  const paidByNumber = new Map<string, { amount: number; date: string }>();
  let highest = 0;

  for (const r of (rows ?? []).slice(0, 5000)) {
    const number = s(r.number, 40);
    const total = n(r.total);
    if (!number || total === null) { res.skipped++; continue; }
    if (numbers.has(key(number))) { res.skipped++; continue; }
    if (invRoom <= 0) { res.limited++; continue; }

    const paidIn = Math.min(n(r.amount_paid) ?? 0, total);
    const status = mapStatus(s(r.status, 40), total, paidIn);
    const amountPaid = status === "paid" ? total : paidIn;
    const issue = d(r.issue_date), due = d(r.due_date) ?? issue;
    const paidDate = d(r.paid_date) ?? (status === "paid" ? (due ?? issue) : null);

    numbers.add(key(number)); invRoom--;
    const m = number.match(/(\d+)\s*$/); if (m) highest = Math.max(highest, parseInt(m[1], 10));

    invRows.push({
      tenant_id: tenantId,
      client_id: await clientIdFor(s(r.client, 200), s(r.client_email, 200)),
      number, issue_date: issue, due_date: due,
      paid_date: status === "paid" ? paidDate : null,
      description: s(r.description, 300) || null,
      status, tax_rate: 0, discount: 0, notes: null, recurring: null,
      items: [{ desc: s(r.description, 300) || "Imported invoice " + number, qty: 1, rate: total, total }],
      subtotal: total, total, amount_paid: amountPaid,
      // Imported history is not chased unless asked for.
      reminders_sent: opts.remind ? 0 : 3, due_soon_sent: !opts.remind,
      sent_at: status === "draft" ? null : new Date().toISOString(),
    });
    if (amountPaid > 0) paidByNumber.set(number, { amount: amountPaid, date: paidDate ?? issue ?? new Date().toISOString().slice(0, 10) });
  }

  for (let i = 0; i < invRows.length; i += 300) {
    const chunk = invRows.slice(i, i + 300);
    const { data: made, error } = await supabase.from("invoices").insert(chunk).select("id, number");
    if (error) { res.messages.push(error.message); break; }
    res.created += made?.length ?? 0;
    const pays = (made ?? []).filter((m: any) => paidByNumber.has(m.number)).map((m: any) => ({
      tenant_id: tenantId, invoice_id: m.id, amount: paidByNumber.get(m.number)!.amount,
      paid_on: paidByNumber.get(m.number)!.date, method: "Imported", note: "Imported from CSV",
    }));
    if (pays.length) {
      const { error: pErr } = await supabase.from("payments").insert(pays);
      if (pErr) res.messages.push("Payments: " + pErr.message);
    }
  }

  // Keep new invoice numbers after the imported ones.
  if (highest && highest >= (tenant?.next_invoice_number ?? 0)) {
    await supabase.from("tenants").update({ next_invoice_number: highest + 1 }).eq("id", tenantId);
  }

  if (clientsCreated) res.messages.push(`${clientsCreated} new client${clientsCreated === 1 ? "" : "s"} created from the file.`);
  if (noClient) res.messages.push(`${noClient} invoice${noClient === 1 ? "" : "s"} imported without a client (Free plan client limit).`);
  if (res.limited) res.messages.push(`${res.limited} not imported: the Free plan holds ${limits.maxInvoices} invoices. Upgrade to Pro for unlimited.`);
  return res;
}

"use server";
// lib/db/reconcile.ts — statement matching: suggest matches, then record the
// ones the user confirms as payments (with fees and landed amounts).
import { attempt, type Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { recalcInvoice } from "@/lib/db/ledger";
import { balanceDue, curOf, round2 } from "@/lib/format";
import { fxRate } from "@/lib/fx";
import { suggest, type OpenInvoice, type Candidate } from "@/lib/reconcile";
import type { StatementLine } from "@/lib/statements";

const SOURCES = ["wise", "paypal", "payoneer", "grey", "fnb", "capitec", "bank"];
const LABEL: Record<string, string> = { wise: "Wise", paypal: "PayPal", payoneer: "Payoneer", grey: "Grey", fnb: "FNB", capitec: "Capitec", bank: "Bank" };

export type Prepared = {
  home: string;
  invoices: OpenInvoice[];
  rates: Record<string, number>;
  rows: { line: StatementLine; candidates: Candidate[]; chosen: Candidate | null; duplicate: boolean }[];
};

async function prepareImpl(lines: StatementLine[], source: string): Promise<Prepared> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  if (!SOURCES.includes(source)) source = "bank";
  lines = (Array.isArray(lines) ? lines : []).slice(0, 2000);

  const [{ data: t }, { data: inv }, { data: clients }, { data: existing }] = await Promise.all([
    supabase.from("tenants").select("currency").eq("id", tenantId).maybeSingle(),
    supabase.from("invoices").select("id, number, issue_date, currency, total, amount_paid, status, fx_rate, client_id, disputed_at")
      .eq("tenant_id", tenantId).in("status", ["unpaid"]),
    supabase.from("clients").select("id, name, contact, email").eq("tenant_id", tenantId),
    supabase.from("payments").select("source_ref").eq("tenant_id", tenantId).eq("source", source).not("source_ref", "is", null),
  ]);
  const home = t?.currency || "ZAR";
  const cmap = new Map((clients ?? []).map((c: any) => [c.id, c]));
  const invoices: OpenInvoice[] = (inv ?? [])
    .map((i: any) => {
      const c: any = i.client_id ? cmap.get(i.client_id) : null;
      return {
        id: i.id, number: i.number, issue_date: i.issue_date, currency: curOf(i, home),
        total: Number(i.total), balance: balanceDue(i), fx_rate: i.fx_rate,
        client_id: i.client_id, client_name: c?.name || "", client_contact: c?.contact || "", client_email: c?.email || "",
        disputed: !!i.disputed_at,
      };
    })
    .filter((i) => i.balance > 0);

  // Rates for any statement currency that's neither home nor an invoice currency.
  const rates: Record<string, number> = {};
  const curs = new Set(lines.map((l) => l.currency));
  for (const from of curs) {
    for (const to of new Set([home, ...invoices.map((i) => i.currency)])) {
      if (from === to) continue;
      const r = await fxRate(from, to);
      if (r) rates[from + ">" + to] = r;
    }
  }

  const seen = new Set((existing ?? []).map((p: any) => p.source_ref));
  const rows = suggest(lines, invoices, home).map((r) => ({ ...r, duplicate: seen.has(r.line.sourceRef) }));
  return { home, invoices, rates, rows };
}

export type ApplyItem = {
  invoiceId: string; amount: number; fee: number; home: number; estimated: boolean;
  date: string | null; sourceRef: string; payer: string; reference: string;
};

async function applyImpl(source: string, items: ApplyItem[]): Promise<{ created: number; duplicates: number; errors: string[] }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  if (!SOURCES.includes(source)) source = "bank";
  const out = { created: 0, duplicates: 0, errors: [] as string[] };
  const touched = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  for (const it of (items ?? []).slice(0, 500)) {
    const { data: inv } = await supabase.from("invoices").select("id, number, total, amount_paid, status")
      .eq("tenant_id", tenantId).eq("id", it.invoiceId).maybeSingle();
    if (!inv) { out.errors.push("Invoice not found"); continue; }
    const amount = round2(Number(it.amount) || 0);
    const bal = round2(Number(inv.total) - Number(inv.amount_paid || 0));
    if (amount <= 0) { out.errors.push(`${inv.number}: amount must be more than 0`); continue; }
    if (amount > bal + 0.01) { out.errors.push(`${inv.number}: ${amount.toFixed(2)} is more than the ${bal.toFixed(2)} still owed`); continue; }

    const note = [it.payer, it.reference].filter(Boolean).join(" · ").slice(0, 300) || null;
    const { error } = await supabase.from("payments").insert({
      tenant_id: tenantId, invoice_id: inv.id, amount,
      paid_on: it.date && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : today,
      method: LABEL[source], note,
      home_amount: round2(Math.max(0, Number(it.home) || 0)),
      fee: round2(Math.max(0, Number(it.fee) || 0)),
      home_estimated: !!it.estimated,
      source, source_ref: String(it.sourceRef || "").slice(0, 200) || null,
    });
    if (error) {
      if (error.code === "23505") out.duplicates++;
      else out.errors.push(`${inv.number}: ${error.message}`);
      continue;
    }
    out.created++;
    touched.add(inv.id);
  }
  for (const id of touched) await recalcInvoice(supabase, tenantId, id);
  return out;
}

export async function prepareMatches(lines: StatementLine[], source: string): Promise<Result<Prepared>> {
  return attempt(() => prepareImpl(lines, source));
}
export async function applyMatches(source: string, items: ApplyItem[]): Promise<Result<{ created: number; duplicates: number; errors: string[] }>> {
  return attempt(() => applyImpl(source, items));
}

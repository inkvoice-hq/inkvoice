// app/app/export/[kind]/route.ts
// Downloads: /app/export/clients, /app/export/invoices, /app/export/quotes,
// /app/export/payments. Logged-in only (middleware + requireTenant).
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { toCSV } from "@/lib/csv";
import { displayStatus, balanceDue, curOf } from "@/lib/format";

export const dynamic = "force-dynamic";

function file(name: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

const lines = (items: any[]) =>
  (Array.isArray(items) ? items : []).map((i) => `${i.desc} x ${i.qty} @ ${Number(i.rate).toFixed(2)}`).join(" | ");

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const stamp = new Date().toISOString().slice(0, 10);

  const [{ data: tenant }, { data: clients }] = await Promise.all([
    supabase.from("tenants").select("currency").eq("id", tenantId).maybeSingle(),
    supabase.from("clients").select("*").eq("tenant_id", tenantId).order("name"),
  ]);
  const cur = tenant?.currency || "ZAR";
  const byId = new Map((clients ?? []).map((c: any) => [c.id, c]));

  if (kind === "clients") {
    return file(`zarbill-clients-${stamp}.csv`, toCSV(
      ["Name", "Contact", "Email", "Phone", "Address", "Website", "Tax/VAT number", "Industry", "Notes"],
      (clients ?? []).map((c: any) => [c.name, c.contact, c.email, c.phone, c.address, c.website, c.tax_id, c.industry, c.notes]),
    ));
  }

  if (kind === "invoices") {
    const { data } = await supabase.from("invoices").select("*").eq("tenant_id", tenantId).order("issue_date", { ascending: true });
    return file(`zarbill-invoices-${stamp}.csv`, toCSV(
      ["Invoice Number", "Client", "Client Email", "Issue Date", "Due Date", "Status", "Currency", "Subtotal",
       "Tax Rate %", "Discount", "Total", "Amount Paid", "Balance Due", "Paid Date", "Description", "Line Items", "Notes", "Recurring"],
      (data ?? []).map((i: any) => {
        const c = byId.get(i.client_id);
        return [i.number, c?.name, c?.email, i.issue_date, i.due_date, displayStatus(i.status, i.due_date, i.amount_paid), curOf(i, cur),
          Number(i.subtotal).toFixed(2), Number(i.tax_rate), Number(i.discount).toFixed(2), Number(i.total).toFixed(2),
          Number(i.amount_paid || 0).toFixed(2), balanceDue(i).toFixed(2), i.paid_date, i.description, lines(i.items), i.notes, i.recurring];
      }),
    ));
  }

  if (kind === "quotes") {
    const { data } = await supabase.from("quotes").select("*").eq("tenant_id", tenantId).order("issue_date", { ascending: true });
    return file(`zarbill-quotes-${stamp}.csv`, toCSV(
      ["Quote Number", "Client", "Date", "Valid Until", "Status", "Currency", "Subtotal", "Tax Rate %", "Discount", "Total", "Description", "Line Items"],
      (data ?? []).map((q: any) => [q.number, byId.get(q.client_id)?.name, q.issue_date, q.valid_until, q.status, curOf(q, cur),
        Number(q.subtotal).toFixed(2), Number(q.tax_rate), Number(q.discount).toFixed(2), Number(q.total).toFixed(2), q.description, lines(q.items)]),
    ));
  }

  if (kind === "payments") {
    const [{ data: pays }, { data: invs }] = await Promise.all([
      supabase.from("payments").select("*").eq("tenant_id", tenantId).order("paid_on", { ascending: true }),
      supabase.from("invoices").select("id, number, client_id, currency").eq("tenant_id", tenantId),
    ]);
    const invById = new Map((invs ?? []).map((i: any) => [i.id, i]));
    return file(`zarbill-payments-${stamp}.csv`, toCSV(
      ["Date", "Invoice Number", "Client", "Amount", "Currency", `Received (${cur})`, `Fees (${cur})`, "Method", "Note"],
      (pays ?? []).map((p: any) => {
        const inv = invById.get(p.invoice_id);
        return [p.paid_on, inv?.number, byId.get(inv?.client_id)?.name, Number(p.amount).toFixed(2), curOf(inv, cur),
          p.home_amount == null ? "" : Number(p.home_amount).toFixed(2), Number(p.fee || 0).toFixed(2), p.method, p.note];
      }),
    ));
  }

  if (kind === "income") {
    // Every payment received in a period, in the account currency: what was
    // invoiced, what actually landed after fees, and the effective rate.
    const q = new URL(req.url).searchParams;
    const iso = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const from = iso(q.get("from")) ?? stamp.slice(0, 4) + "-01-01";
    const to = iso(q.get("to")) ?? stamp;
    const [{ data: pays }, { data: invs }] = await Promise.all([
      supabase.from("payments").select("*").eq("tenant_id", tenantId).gte("paid_on", from).lte("paid_on", to).order("paid_on", { ascending: true }),
      supabase.from("invoices").select("id, number, client_id, currency").eq("tenant_id", tenantId),
    ]);
    const invById = new Map((invs ?? []).map((i: any) => [i.id, i]));
    let totHome = 0, totFees = 0;
    const rows = (pays ?? []).map((p: any) => {
      const inv = invById.get(p.invoice_id);
      const c = curOf(inv, cur);
      const homeAmt = Number(p.home_amount ?? p.amount);
      const fee = Number(p.fee || 0);
      totHome += homeAmt; totFees += fee;
      const rate = c !== cur && Number(p.amount) > 0 ? ((homeAmt + fee) / Number(p.amount)).toFixed(4) : "";
      return [p.paid_on, inv?.number, byId.get(inv?.client_id)?.name, c, Number(p.amount).toFixed(2),
        (homeAmt + fee).toFixed(2), fee.toFixed(2), homeAmt.toFixed(2), rate, p.home_estimated ? "estimate" : "", p.method];
    });
    rows.push([], ["TOTAL", "", "", "", "", (totHome + totFees).toFixed(2), totFees.toFixed(2), totHome.toFixed(2), "", "", ""]);
    return file(`zarbill-income-${from}-to-${to}.csv`, toCSV(
      ["Date received", "Invoice", "Client", "Invoice currency", "Amount (invoice currency)",
        `Value before fees (${cur})`, `Fees (${cur})`, `Received (${cur})`, "Effective rate", `${cur} estimated?`, "Paid via"],
      rows,
    ));
  }

  return new Response("Unknown export", { status: 404 });
}

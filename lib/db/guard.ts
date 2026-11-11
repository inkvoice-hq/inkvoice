"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { atLimit, monthStartISO } from "@/lib/plans";

export async function assertCanCreate(kind: "clients" | "invoices"): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants").select("plan").eq("id", tenantId).maybeSingle();

  const plan = tenant?.plan ?? "free";

  // Clients: total. Invoices: created this calendar month.
  let q = supabase
    .from(kind)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (kind === "invoices") q = q.gte("created_at", monthStartISO());
  const { count } = await q;

  if (atLimit(plan, kind, count ?? 0)) {
    throw new Error(kind === "invoices"
      ? "You've reached your plan's invoice limit for this month."
      : "You've reached your plan's client limit.");
  }
}

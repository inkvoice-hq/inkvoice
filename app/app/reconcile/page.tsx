import type { Metadata } from "next";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { ReconcileView } from "./ReconcileView";

export const metadata: Metadata = { title: "Match payments" };

export default async function ReconcilePage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: t } = await supabase.from("tenants").select("currency").eq("id", tenantId).maybeSingle();
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).eq("status", "unpaid");
  return <ReconcileView homeCurrency={t?.currency || "ZAR"} openCount={count ?? 0} />;
}

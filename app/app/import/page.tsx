import type { Metadata } from "next";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { ImportView } from "./ImportView";

export const metadata: Metadata = { title: "Import & export" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { tenantId } = await requireTenant();
  const { type } = await searchParams;
  const supabase = await createClient();
  const { data: t } = await supabase.from("tenants").select("currency").eq("id", tenantId).maybeSingle();
  return <ImportView initialType={type === "invoices" ? "invoices" : "clients"} homeCurrency={t?.currency || "ZAR"} />;
}

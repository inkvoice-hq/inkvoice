import { listClients } from "@/lib/db/clients";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { ClientsView } from "./ClientsView";

export default async function ClientsPage() {
  const clients = await listClients();
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: t } = await supabase.from("tenants").select("currency").eq("id", tenantId).maybeSingle();
  return <ClientsView initialClients={clients} homeCurrency={t?.currency || "ZAR"} />;
}

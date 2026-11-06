import { getTenant } from "@/lib/db/tenant";
import { listClients } from "@/lib/db/clients";
import { listInvoices } from "@/lib/db/invoices";
import { UpgradeView } from "./UpgradeView";
import { getRegion } from "@/lib/region";
import { monthStartISO } from "@/lib/plans";

export default async function UpgradePage() {
  const [tenant, clients, invoices, region] = await Promise.all([
    getTenant(), listClients(), listInvoices(), getRegion(),
  ]);
  return (
    <UpgradeView
      plan={tenant?.plan ?? "free"}
      clientCount={clients.length}
      invoiceCount={invoices.filter((i) => (i.created_at || "") >= monthStartISO()).length}
      isZA={region.isZA}
    />
  );
}

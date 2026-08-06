import { getTenant } from "@/lib/db/tenant";
import { listClients } from "@/lib/db/clients";
import { listInvoices } from "@/lib/db/invoices";
import { UpgradeView } from "./UpgradeView";

export default async function UpgradePage() {
  const [tenant, clients, invoices] = await Promise.all([
    getTenant(), listClients(), listInvoices(),
  ]);
  return (
    <UpgradeView
      plan={tenant?.plan ?? "free"}
      clientCount={clients.length}
      invoiceCount={invoices.length}
    />
  );
}

import { listClients } from "@/lib/db/clients";
import { ClientsView } from "./ClientsView";

export default async function ClientsPage() {
  const clients = await listClients();
  return <ClientsView initialClients={clients} />;
}

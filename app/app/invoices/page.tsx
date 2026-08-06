import { listInvoices, nextInvoiceNumber } from "@/lib/db/invoices";
import { listClients } from "@/lib/db/clients";
import { listProducts } from "@/lib/db/products";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { InvoicesView } from "./InvoicesView";

export default async function InvoicesPage() {
  const [invoices, clients, products, suggestedNumber] = await Promise.all([
    listInvoices(),
    listClients(),
    listProducts(),
    nextInvoiceNumber(),
  ]);

  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, email, address, phone, currency, payment_terms, default_tax_rate, invoice_notes, footer_message")
    .eq("id", tenantId)
    .maybeSingle();

  return (
    <InvoicesView
      initialInvoices={invoices}
      clients={clients}
      products={products}
      suggestedNumber={suggestedNumber}
      tenant={tenant ?? null}
    />
  );
}

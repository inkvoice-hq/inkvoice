import type { Metadata } from "next";
import { listQuotes, nextQuoteNumber } from "@/lib/db/quotes";
import { listClients } from "@/lib/db/clients";
import { listProducts } from "@/lib/db/products";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { QuotesView } from "./QuotesView";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const [quotes, clients, products, suggestedNumber] = await Promise.all([
    listQuotes(), listClients(), listProducts(), nextQuoteNumber(),
  ]);
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants").select("currency, default_tax_rate").eq("id", tenantId).maybeSingle();

  return (
    <QuotesView
      initialQuotes={quotes}
      clients={clients}
      products={products}
      suggestedNumber={suggestedNumber}
      currency={tenant?.currency ?? "ZAR"}
      defaultTaxRate={Number(tenant?.default_tax_rate) || 0}
    />
  );
}

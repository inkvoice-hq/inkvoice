"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import type { Tenant, TenantSettingsInput } from "@/lib/db/types";

export async function getTenant(): Promise<Tenant | null> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Tenant) ?? null;
}

export async function updateTenantSettings(input: TenantSettingsInput): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenants")
    .update({
      name: (input.name || "My Business").trim(),
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      website: input.website || null,
      tax_reg: input.tax_reg || null,
      business_type: input.business_type,
      currency: input.currency,
      payment_terms: Math.max(0, Math.floor(Number(input.payment_terms) || 30)),
      default_tax_rate: Math.max(0, Number(input.default_tax_rate) || 0),
      next_invoice_number: Math.max(1, Math.floor(Number(input.next_invoice_number) || 1001)),
      invoice_notes: input.invoice_notes || null,
      footer_message: input.footer_message || null,
    })
    .eq("id", tenantId);

  if (error) throw new Error(error.message);
}

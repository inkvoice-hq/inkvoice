"use server";
// lib/email/invoice.ts — the "Email to client" button in the app.
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { deliverInvoiceEmail } from "@/lib/email/invoice-core";

export async function sendInvoiceEmail(
  invoiceId: string
): Promise<{ ok: boolean; message: string }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  return deliverInvoiceEmail(supabase, tenantId, invoiceId);
}

// lib/public-invoice.ts
// -----------------------------------------------------------------------------
// Server action for the public hosted invoice page (/i/<token>).
// Records the FIRST time the client opens the invoice ("Viewed" in the app).
//
// It is triggered from the browser after the page loads (not during server
// render), so email link scanners that only fetch the HTML don't count as a
// view. Views by the business owner themselves are ignored.
// -----------------------------------------------------------------------------
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function recordInvoiceView(token: string): Promise<void> {
  if (!UUID_RE.test(token)) return;
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("invoices")
    .select("id, tenant_id, viewed_at, status")
    .eq("public_token", token)
    .maybeSingle();
  if (!inv || inv.viewed_at || inv.status === "draft") return;

  // Ignore the owner previewing their own invoice link.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member } = await admin
        .from("memberships")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", inv.tenant_id)
        .maybeSingle();
      if (member) return;
    }
  } catch {
    // not logged in -> treat as a client view
  }

  await admin
    .from("invoices")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", inv.id)
    .is("viewed_at", null);
}

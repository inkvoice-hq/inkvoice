"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { atLimit } from "@/lib/plans";

export async function assertCanCreate(kind: "clients" | "invoices"): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants").select("plan").eq("id", tenantId).maybeSingle();

  const plan = tenant?.plan ?? "free";

  const { count } = await supabase
    .from(kind)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (atLimit(plan, kind, count ?? 0)) {
    throw new Error(
      `You've reached the Free plan limit for ${kind}. Upgrade to Pro for unlimited ${kind}.`
    );
  }
}

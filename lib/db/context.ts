import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  email: string | null;
  tenantId: string;
}

export async function requireTenant(): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let tenantId = membership?.tenant_id as string | undefined;

  if (!tenantId) {
    const { data: newTenantId, error } = await supabase.rpc("bootstrap_tenant", {
      p_business_name: "My Business",
      p_email: user.email ?? null,
    });
    if (error || !newTenantId) {
      throw new Error("Failed to resolve tenant: " + (error?.message ?? "unknown"));
    }
    tenantId = newTenantId as string;
  }

  return { userId: user.id, email: user.email ?? null, tenantId };
}

import type { Metadata } from "next";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { tenantId, email } = await requireTenant();
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants").select("name, plan, created_at").eq("id", tenantId).maybeSingle();
  return (
    <AccountView
      email={email ?? ""}
      bizName={tenant?.name || "Your Business"}
      plan={tenant?.plan || "free"}
      since={tenant?.created_at ?? null}
    />
  );
}

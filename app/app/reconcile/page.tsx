import type { Metadata } from "next";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { ReconcileView } from "./ReconcileView";
import { ProGate } from "@/components/ProGate";
import { isPaidPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Match payments" };

export default async function ReconcilePage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data: t } = await supabase.from("tenants").select("currency, plan").eq("id", tenantId).maybeSingle();
  if (!isPaidPlan(t?.plan)) {
    return (
      <>
        <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(10,10,13,0.85)", borderBottom: "1px solid var(--border)", padding: "0 32px", height: 60, display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Match payments</div>
        </div>
        <div style={{ padding: 32 }}>
          <ProGate title="Match payments from your statements"
            points={[
              "Upload a Wise, Payoneer, PayPal, FNB, Capitec or other bank statement",
              "Each payment is matched to its invoice, with the reason shown",
              "Fees and the amount that landed are recorded for you",
              "Re-uploading the same statement never doubles anything up",
            ]}>
            Stop cross-checking statements against invoices by hand. Zarbill reads your statement,
            finds the client payments and marks the right invoices paid, after you confirm.
          </ProGate>
        </div>
      </>
    );
  }
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).eq("status", "unpaid");
  return <ReconcileView homeCurrency={t?.currency || "ZAR"} openCount={count ?? 0} />;
}

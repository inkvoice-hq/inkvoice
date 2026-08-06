import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const supabase = createAdminClient();

  try {
    switch (event.event) {
      case "charge.success": {
        const meta = event.data?.metadata ?? {};
        const tenantId = meta.tenant_id;
        const plan = meta.plan === "business" ? "business" : "pro";
        if (!tenantId) break;

        await supabase.from("tenants").update({ plan }).eq("id", tenantId);
        await supabase.from("subscriptions").upsert({
          tenant_id: tenantId,
          paystack_customer_code: event.data?.customer?.customer_code ?? null,
          plan,
          status: "active",
          amount: (event.data?.amount ?? 0) / 100,
          currency: event.data?.currency ?? "ZAR",
        }, { onConflict: "tenant_id" });
        break;
      }

      case "subscription.create": {
        const meta = event.data?.metadata ?? {};
        const tenantId = meta.tenant_id;
        const plan = meta.plan === "business" ? "business" : "pro";
        if (!tenantId) break;

        await supabase.from("tenants").update({ plan }).eq("id", tenantId);
        await supabase.from("subscriptions").upsert({
          tenant_id: tenantId,
          paystack_subscription_code: event.data?.subscription_code ?? null,
          paystack_customer_code: event.data?.customer?.customer_code ?? null,
          paystack_email_token: event.data?.email_token ?? null,
          plan,
          status: "active",
          amount: (event.data?.amount ?? 0) / 100,
          currency: event.data?.plan?.currency ?? "ZAR",
          next_payment_date: event.data?.next_payment_date ?? null,
        }, { onConflict: "tenant_id" });
        break;
      }

      case "invoice.payment_failed": {
        const code = event.data?.subscription?.subscription_code;
        if (code) {
          await supabase.from("subscriptions")
            .update({ status: "past_due" })
            .eq("paystack_subscription_code", code);
        }
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const code = event.data?.subscription_code;
        if (!code) break;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .eq("paystack_subscription_code", code)
          .maybeSingle();

        await supabase.from("subscriptions")
          .update({ status: "cancelled" })
          .eq("paystack_subscription_code", code);

        if (sub?.tenant_id) {
          await supabase.from("tenants").update({ plan: "free" }).eq("id", sub.tenant_id);
        }
        break;
      }
    }
  } catch {
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

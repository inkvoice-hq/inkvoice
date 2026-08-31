import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/db/context";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId, email } = await requireTenant();
    if (!email) return NextResponse.json({ error: "No email on account." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "business" ? "business" : "pro";
    // Paystack South Africa settles in ZAR only. The toggle picks a PRICING
    // TIER, not a settlement currency; every charge is made in rands and the
    // customer's bank converts. A plan code makes it a monthly subscription.
    const tier = body?.currency === "USD" ? "US" : "SA";
    const currency = "ZAR";

    const PLANS = {
      SA: {
        pro: { code: process.env.PAYSTACK_PLAN_SA_PRO, amount: 9900 },
        business: { code: process.env.PAYSTACK_PLAN_SA_BIZ, amount: 69900 },
      },
      US: {
        pro: { code: process.env.PAYSTACK_PLAN_US_PRO, amount: 30000 },
        business: { code: process.env.PAYSTACK_PLAN_US_BIZ, amount: 79900 },
      },
    } as const;

    const chosen = PLANS[tier][plan];
    const amount = chosen.amount;
    const planCode = chosen.code;
    if (!amount) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Payments not configured." }, { status: 500 });

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        currency,
        callback_url: `${origin}/app/upgrade?status=processing`,
        ...(planCode ? { plan: planCode } : {}),
        metadata: { tenant_id: tenantId, user_id: userId, plan },
      }),
    });

    const data = await res.json();
    if (!data?.status) {
      return NextResponse.json({ error: data?.message ?? "Paystack error." }, { status: 400 });
    }

    return NextResponse.json({ url: data.data.authorization_url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/db/context";
import { PLAN_PRICING } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId, email } = await requireTenant();
    if (!email) return NextResponse.json({ error: "No email on account." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "business" ? "business" : "pro";
    // Paystack South Africa settles in ZAR only. We may DISPLAY $ prices,
    // but every charge is made in rands; the customer's bank converts.
    const currency = "ZAR";

    const amount = PLAN_PRICING[plan].ZAR;
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

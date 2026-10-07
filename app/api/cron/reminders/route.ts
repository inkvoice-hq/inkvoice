// app/api/cron/reminders/route.ts
// -----------------------------------------------------------------------------
// Daily job (see vercel.json) that sends automatic payment reminders.
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
// Add ?dry=1 to see what WOULD be sent without emailing anyone.
// -----------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const result = await runReminders({ dryRun });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

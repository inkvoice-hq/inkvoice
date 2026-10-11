// app/api/cron/daily/route.ts
// -----------------------------------------------------------------------------
// The one daily job (see vercel.json). Vercel Cron calls it with
// "Authorization: Bearer <CRON_SECRET>". Order matters:
//   1. scheduled sends   2. recurring copies   3. due-soon + overdue reminders
// Add ?dry=1 to see what WOULD happen without creating or emailing anything.
// -----------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";
import { runScheduledSends, runRecurring } from "@/lib/recurring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  const out: Record<string, unknown> = { dryRun };
  for (const [name, job] of [
    ["scheduledSends", runScheduledSends],
    ["recurring", runRecurring],
    ["reminders", runReminders],
  ] as const) {
    try { out[name] = await job({ dryRun }); }
    catch (e: any) { out[name] = { error: e?.message || "failed" }; }
  }
  return NextResponse.json(out);
}

// lib/fx.ts
// -----------------------------------------------------------------------------
// Exchange rates. One fetch per day from ExchangeRate-API's free open endpoint
// (https://www.exchangerate-api.com, daily rates, no key, attribution shown in
// the app), cached in the fx_rates table so every user shares it.
//
// rate(from, to) = how many `to` units one `from` unit buys.
// Server-only. Never throws: if rates are unavailable it returns null and the
// caller stores no rate (treated as 1:1 until the user enters real amounts).
// -----------------------------------------------------------------------------
import { createAdminClient } from "@/lib/supabase/admin";

const FX_URL = process.env.FX_API_URL || "https://open.er-api.com/v6/latest/USD";

let memo: { day: string; rates: Record<string, number> } | null = null;

export async function todaysRates(): Promise<Record<string, number> | null> {
  const day = new Date().toISOString().slice(0, 10);
  if (memo?.day === day) return memo.rates;

  const admin = createAdminClient();
  try {
    const { data } = await admin.from("fx_rates").select("rates").eq("day", day).maybeSingle();
    if (data?.rates) { memo = { day, rates: data.rates as Record<string, number> }; return memo.rates; }
  } catch { /* fall through to fetch */ }

  try {
    const res = await fetch(FX_URL, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    const json = await res.json();
    if (json?.result !== "success" || !json.rates?.USD) throw new Error("bad response");
    const rates = json.rates as Record<string, number>;
    await admin.from("fx_rates").upsert({ day, base: "USD", rates }, { onConflict: "day" });
    memo = { day, rates };
    return rates;
  } catch {
    // Use the most recent cached day rather than nothing.
    try {
      const { data } = await admin.from("fx_rates").select("rates").order("day", { ascending: false }).limit(1).maybeSingle();
      return (data?.rates as Record<string, number>) ?? null;
    } catch { return null; }
  }
}

/** Units of `to` per 1 unit of `from`, e.g. rate("USD","ZAR") ≈ 16.5. */
export async function fxRate(from: string, to: string): Promise<number | null> {
  if (!from || !to) return null;
  if (from === to) return 1;
  const rates = await todaysRates();
  const f = rates?.[from], t = rates?.[to];
  if (!f || !t) return null;
  return Math.round((t / f) * 1e8) / 1e8;
}

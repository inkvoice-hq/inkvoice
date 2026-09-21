import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const EURO = ["AT","BE","CY","DE","EE","ES","FI","FR","GR","HR","IE","IT","LT","LU","LV","MT","NL","PT","SI","SK"];

export function currencyForCountry(country: string): string {
  const c = (country || "").toUpperCase();
  if (c === "ZA") return "ZAR";
  if (c === "GB") return "GBP";
  if (c === "AU") return "AUD";
  if (c === "CA") return "CAD";
  if (EURO.includes(c)) return "EUR";
  return "USD";
}

// Vercel stamps every request with the visitor's country.
// Locally there is no header, so we fall back to South Africa.
export async function getRegion() {
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") || "ZA").toUpperCase();
  return { country, isZA: country === "ZA", currency: currencyForCountry(country) };
}

// Sets a brand-new workspace's currency from the visitor's country, once.
// Existing workspaces have region_set = true, so user choices are never overwritten.
export async function applyRegionDefaults(tenantId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("tenants").select("region_set").eq("id", tenantId).maybeSingle();
    const row = data as { region_set?: boolean } | null;
    if (!row || row.region_set) return;
    const { currency } = await getRegion();
    const safe = ["ZAR", "USD", "GBP", "EUR"].includes(currency) ? currency : "USD";
    await supabase.from("tenants").update({ currency: safe, region_set: true } as any).eq("id", tenantId);
  } catch {
    // A convenience default should never block the app.
  }
}

import { headers } from "next/headers";

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

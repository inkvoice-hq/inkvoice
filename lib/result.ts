// lib/result.ts
// -----------------------------------------------------------------------------
// Why this exists: in production, Next.js hides the message of any error
// thrown inside a server action ("An error occurred in the Server Components
// render..."). So "Invoice number already exists" or "You've reached the Free
// plan limit" never reached the user. Server actions now RETURN their errors:
//
//   server:  export async function saveX(...) { return attempt(() => saveXImpl(...)); }
//   client:  unwrap(await saveX(...))   // throws a normal Error with the real message
// -----------------------------------------------------------------------------
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e: any) {
    // Let Next.js redirects / notFound through (e.g. session expired -> /login).
    if (typeof e?.digest === "string" && e.digest.startsWith("NEXT_")) throw e;
    return { ok: false, error: String(e?.message || "Something went wrong. Please try again.") };
  }
}

export function unwrap<T>(r: Result<T>): T {
  if (!r || (r as any).ok !== true) throw new Error((r as any)?.error || "Something went wrong. Please try again.");
  return (r as { ok: true; data: T }).data;
}

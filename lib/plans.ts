export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  maxClients: number;
  /** Invoices created per calendar month (-1 = unlimited). */
  maxInvoices: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:     { maxClients: 3,  maxInvoices: 10 },
  pro:      { maxClients: -1, maxInvoices: -1 },
  business: { maxClients: -1, maxInvoices: -1 },
};

export const PLAN_PRICING = {
  pro: { ZAR: 9900, USD: 1800 },
  business: { ZAR: 69900, USD: 4900 },
} as const;

/** Claude-drafted follow-up emails per calendar month. */
export const AI_DRAFTS_PER_MONTH: Record<PlanId, number> = { free: 5, pro: 200, business: 500 };

export function aiDraftLimit(plan: string | null | undefined): number {
  return AI_DRAFTS_PER_MONTH[(plan as PlanId) ?? "free"] ?? AI_DRAFTS_PER_MONTH.free;
}

export function planLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[(plan as PlanId) ?? "free"] ?? PLAN_LIMITS.free;
}

export function isUnlimited(n: number): boolean {
  return n < 0;
}

export function atLimit(plan: string | null | undefined, kind: "clients" | "invoices", count: number): boolean {
  const l = planLimits(plan);
  const max = kind === "clients" ? l.maxClients : l.maxInvoices;
  if (isUnlimited(max)) return false;
  return count >= max;
}

/** ISO timestamp for the start of the current calendar month (UTC), for monthly allowances. */
export function monthStartISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Features that need a paid plan. */
export type ProFeature = "matching" | "fees";

export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "business";
}

export function hasFeature(plan: string | null | undefined, _f: ProFeature): boolean {
  return isPaidPlan(plan);
}

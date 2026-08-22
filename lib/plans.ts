export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  maxClients: number;
  maxInvoices: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:     { maxClients: 3,  maxInvoices: 5 },
  pro:      { maxClients: -1, maxInvoices: -1 },
  business: { maxClients: -1, maxInvoices: -1 },
};

export const PLAN_PRICING = {
  pro: { ZAR: 9900, USD: 1800 },
  business: { ZAR: 69900, USD: 4900 },
} as const;

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

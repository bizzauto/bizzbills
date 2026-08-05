// Server-side plan limits — single source of truth for enforcement.
// Mirrors the PLANS catalogue in src/app/settings/subscription/page.tsx.
// invoiceLimit: number | null (null = unlimited)
// userLimit: number | null (null = unlimited, -1 legacy = unlimited)

export type PlanLimit = {
  invoiceLimit: number | null;
  userLimit: number | null;
};

export const PLAN_LIMITS: Record<string, PlanLimit> = {
  free: { invoiceLimit: 10, userLimit: 2 },
  starter: { invoiceLimit: 500, userLimit: 2 },
  professional: { invoiceLimit: null, userLimit: 5 },
  agency: { invoiceLimit: null, userLimit: 25 },
  enterprise: { invoiceLimit: null, userLimit: null },
};

export function getPlanLimit(plan: string | null | undefined): PlanLimit {
  return PLAN_LIMITS[plan ?? "free"] ?? PLAN_LIMITS.free;
}

/** Invoice count used against the monthly plan limit — per org, current calendar month. */
export function invoiceCountWhere(orgId: string | null | undefined) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    ...(orgId ? { orgId } : {}),
    createdAt: { gte: startOfMonth },
  };
}

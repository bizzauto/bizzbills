"use client";

import { useState, useEffect } from "react";

/* ── Plan catalogue (client-side; mirrors server plan strings) ── */

type PlanId = "free" | "starter" | "professional" | "enterprise";

type PlanFeature = {
  label: string;
  included: boolean;
};

type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  price: number; // INR per month
  priceLabel: string;
  invoiceLimit: number | null; // null = unlimited
  userLimit: number;
  features: PlanFeature[];
  highlighted?: boolean;
};

const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started with the basics",
    price: 0,
    priceLabel: "₹0",
    invoiceLimit: 50,
    userLimit: 2,
    features: [
      { label: "Up to 50 invoices / month", included: true },
      { label: "Up to 2 users", included: true },
      { label: "Basic invoice templates", included: true },
      { label: "GST calculations", included: true },
      { label: "All templates", included: false },
      { label: "Priority support", included: false },
      { label: "API access", included: false },
      { label: "Custom branding", included: false },
      { label: "Multi-branch", included: false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For growing businesses",
    price: 999,
    priceLabel: "₹999",
    invoiceLimit: 500,
    userLimit: 5,
    features: [
      { label: "Up to 500 invoices / month", included: true },
      { label: "Up to 5 users", included: true },
      { label: "All invoice templates", included: true },
      { label: "GST calculations", included: true },
      { label: "Priority email support", included: true },
      { label: "API access", included: false },
      { label: "Custom branding", included: false },
      { label: "Multi-branch", included: false },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Everything you need to scale",
    price: 2999,
    priceLabel: "₹2,999",
    invoiceLimit: null,
    userLimit: 20,
    highlighted: true,
    features: [
      { label: "Unlimited invoices", included: true },
      { label: "Up to 20 users", included: true },
      { label: "All invoice templates", included: true },
      { label: "GST calculations", included: true },
      { label: "Priority support", included: true },
      { label: "Full API access", included: true },
      { label: "Custom branding", included: true },
      { label: "Multi-branch support", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Tailored for large organisations",
    price: 9999,
    priceLabel: "₹9,999",
    invoiceLimit: null,
    userLimit: -1, // unlimited
    features: [
      { label: "Unlimited invoices", included: true },
      { label: "Unlimited users", included: true },
      { label: "All invoice templates", included: true },
      { label: "GST calculations", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Full API access", included: true },
      { label: "Custom branding & white-label", included: true },
      { label: "Multi-branch support", included: true },
      { label: "Custom integrations", included: true },
      { label: "SLA guarantee", included: true },
    ],
  },
];

/* ── Mock billing history (replace with real API when available) ── */

type BillingEntry = {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  description: string;
};

const MOCK_BILLING_HISTORY: BillingEntry[] = [
  { id: "inv-001", date: "2026-07-01", amount: 2999, status: "paid", description: "Professional plan - July 2026" },
  { id: "inv-002", date: "2026-06-01", amount: 2999, status: "paid", description: "Professional plan - June 2026" },
  { id: "inv-003", date: "2026-05-01", amount: 999, status: "paid", description: "Starter plan - May 2026" },
  { id: "inv-004", date: "2026-04-01", amount: 0, status: "paid", description: "Free plan" },
];

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return amount === 0 ? "Free" : `₹${amount.toLocaleString("en-IN")}/mo`;
}

function formatInvoiceLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString("en-IN");
}

function formatUserLimit(limit: number): string {
  return limit === -1 ? "Unlimited" : limit.toLocaleString("en-IN");
}

function getPlanDefinition(planId: string): PlanDefinition {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}

function getPlanTierIndex(planId: string): number {
  return PLANS.findIndex((p) => p.id === planId);
}

/* ── Component ── */

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmPlan, setConfirmPlan] = useState<PlanId | null>(null);

  // Usage stats (would come from a real API)
  const [invoicesUsed] = useState(127);
  const [usersUsed] = useState(3);

  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) setCurrentPlan(data.plan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activePlan = getPlanDefinition(currentPlan);
  const activeTierIndex = getPlanTierIndex(currentPlan);

  async function handlePlanChange(targetPlanId: PlanId) {
    setSaving(true);
    setError("");
    setMessage("");
    setConfirmPlan(null);

    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlanId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update plan");
      }

      setCurrentPlan(targetPlanId);
      const targetPlan = getPlanDefinition(targetPlanId);
      const action = getPlanTierIndex(targetPlanId) > activeTierIndex ? "Upgraded" : "Downgraded";
      setMessage(`${action} to ${targetPlan.name} plan successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change plan");
    } finally {
      setSaving(false);
    }
  }

  function getUsagePercentage(used: number, limit: number | null): number {
    if (limit === null || limit <= 0) return 0; // unlimited
    return Math.min(100, Math.round((used / limit) * 100));
  }

  function getUsageBarColor(percentage: number): string {
    if (percentage >= 90) return "var(--danger)";
    if (percentage >= 70) return "var(--warning)";
    return "var(--accent)";
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center pb-10">
        <p className="text-muted">Loading subscription details...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Page Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Subscription &amp; Plans</h1>
            <p className="mt-1 text-sm text-muted">
              Manage your subscription plan, monitor usage, and view billing history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge badge-active">{activePlan.name} Plan</span>
            {activePlan.price > 0 && (
              <span className="text-sm font-medium text-default">
                {formatCurrency(activePlan.price)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Status messages */}
      {message && (
        <div className="animate-slide-up rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
          {message}
        </div>
      )}
      {error && (
        <div className="animate-slide-up rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Current Plan Summary + Usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <div className="section-card">
          <h2 className="section-label">Current Plan</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xl font-semibold text-default">{activePlan.name}</p>
                <p className="text-sm text-muted">{activePlan.tagline}</p>
              </div>
              <p className="text-2xl font-bold text-accent">{activePlan.priceLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3">
                <p className="text-xs text-muted">Invoice Limit</p>
                <p className="mt-0.5 text-lg font-semibold text-default">
                  {formatInvoiceLimit(activePlan.invoiceLimit)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3">
                <p className="text-xs text-muted">User Limit</p>
                <p className="mt-0.5 text-lg font-semibold text-default">
                  {formatUserLimit(activePlan.userLimit)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted mb-2">Included features</p>
              <ul className="space-y-1.5">
                {activePlan.features
                  .filter((f) => f.included)
                  .map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-sm text-default">
                      <svg className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f.label}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="section-card">
          <h2 className="section-label">Usage This Period</h2>
          <div className="mt-4 space-y-6">
            {/* Invoices */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-medium text-default">Invoices Created</p>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-default">{invoicesUsed}</span>
                  {activePlan.invoiceLimit !== null && (
                    <> / {formatInvoiceLimit(activePlan.invoiceLimit)}</>
                  )}
                </p>
              </div>
              {activePlan.invoiceLimit !== null && (
                <>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--badge-bg)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${getUsagePercentage(invoicesUsed, activePlan.invoiceLimit)}%`,
                        backgroundColor: getUsageBarColor(getUsagePercentage(invoicesUsed, activePlan.invoiceLimit)),
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {activePlan.invoiceLimit - invoicesUsed > 0
                      ? `${(activePlan.invoiceLimit - invoicesUsed).toLocaleString("en-IN")} invoices remaining this period`
                      : "Invoice limit reached"}
                  </p>
                </>
              )}
              {activePlan.invoiceLimit === null && (
                <p className="text-xs text-success">No limits on your current plan</p>
              )}
            </div>

            {/* Users */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-medium text-default">Team Members</p>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-default">{usersUsed}</span>
                  {activePlan.userLimit > 0 && (
                    <> / {formatUserLimit(activePlan.userLimit)}</>
                  )}
                </p>
              </div>
              {activePlan.userLimit > 0 && (
                <>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--badge-bg)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${getUsagePercentage(usersUsed, activePlan.userLimit)}%`,
                        backgroundColor: getUsageBarColor(getUsagePercentage(usersUsed, activePlan.userLimit)),
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {activePlan.userLimit - usersUsed > 0
                      ? `${activePlan.userLimit - usersUsed} seats remaining`
                      : "User limit reached"}
                  </p>
                </>
              )}
              {activePlan.userLimit === -1 && (
                <p className="text-xs text-success">Unlimited seats on your current plan</p>
              )}
            </div>

            {/* Quick tips */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Tip</p>
              <p className="mt-1 text-sm text-default">
                {activeTierIndex < PLANS.length - 1
                  ? `Upgrade to ${PLANS[activeTierIndex + 1].name} for ${formatInvoiceLimit(PLANS[activeTierIndex + 1].invoiceLimit)} invoices and ${formatUserLimit(PLANS[activeTierIndex + 1].userLimit)} users.`
                  : "You are on the highest plan. Enjoy unlimited access to all features."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <section className="section-card">
        <h2 className="section-label">Available Plans</h2>
        <p className="mb-6 text-sm text-muted">
          Choose the plan that fits your business. Upgrade or downgrade at any time.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = getPlanTierIndex(plan.id) < activeTierIndex;
            const isUpgrade = getPlanTierIndex(plan.id) > activeTierIndex;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition ${
                  isCurrent
                    ? "border-accent/40 bg-accent/5"
                    : plan.highlighted
                      ? "border-accent/20 bg-[var(--card)]"
                      : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--card-border)] hover:shadow-lg"
                }`}
              >
                {/* Badge */}
                {isCurrent && (
                  <span className="badge badge-active absolute -top-2.5 left-4">Current</span>
                )}
                {plan.highlighted && !isCurrent && (
                  <span className="badge badge-sent absolute -top-2.5 left-4">Most Popular</span>
                )}

                {/* Header */}
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{plan.name}</p>
                  <p className="mt-1 text-3xl font-bold text-default">{plan.priceLabel}</p>
                  {plan.price > 0 && (
                    <p className="text-xs text-muted">per month, billed monthly</p>
                  )}
                </div>

                {/* Limits */}
                <div className="mb-4 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {formatInvoiceLimit(plan.invoiceLimit)} invoices
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {formatUserLimit(plan.userLimit)} users
                  </span>
                </div>

                {/* Features */}
                <ul className="mb-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={f.included ? "text-default" : "text-muted opacity-50"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action */}
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="btn-secondary w-full justify-center opacity-60"
                  >
                    Current Plan
                  </button>
                ) : isUpgrade ? (
                  <button
                    type="button"
                    onClick={() => setConfirmPlan(plan.id)}
                    disabled={saving}
                    className="btn-primary w-full justify-center"
                  >
                    Upgrade to {plan.name}
                  </button>
                ) : isDowngrade ? (
                  <button
                    type="button"
                    onClick={() => setConfirmPlan(plan.id)}
                    disabled={saving}
                    className="btn-secondary w-full justify-center"
                  >
                    Downgrade to {plan.name}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Billing History */}
      <section className="section-card">
        <h2 className="section-label">Billing History</h2>
        <p className="mb-4 text-sm text-muted">
          Your recent payments and invoices.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--table-border)]">
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Date</th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted">Description</th>
                <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted">Amount</th>
                <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BILLING_HISTORY.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--table-border)] transition hover:bg-[var(--table-hover)]"
                >
                  <td className="py-3 text-default">
                    {new Date(entry.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 text-default">{entry.description}</td>
                  <td className="py-3 text-right font-medium text-default">
                    {entry.amount === 0 ? "₹0" : `₹${entry.amount.toLocaleString("en-IN")}`}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`badge ${
                        entry.status === "paid"
                          ? "badge-paid"
                          : entry.status === "pending"
                            ? "badge-pending"
                            : "badge-overdue"
                      }`}
                    >
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {MOCK_BILLING_HISTORY.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No billing history yet.</p>
        )}
      </section>

      {/* Confirm Plan Change Modal */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-default">
              {getPlanTierIndex(confirmPlan) > activeTierIndex ? "Upgrade" : "Downgrade"} Plan
            </h3>
            <p className="mt-2 text-sm text-muted">
              {getPlanTierIndex(confirmPlan) > activeTierIndex
                ? `You are about to upgrade from ${activePlan.name} to ${getPlanDefinition(confirmPlan).name}. The new plan will be active immediately and you will be charged the prorated amount for the rest of the current billing period.`
                : `You are about to downgrade from ${activePlan.name} to ${getPlanDefinition(confirmPlan).name}. The change will take effect at the end of the current billing period. Some features may become unavailable.`}
            </p>
            <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">New plan</span>
                <span className="text-sm font-semibold text-default">
                  {getPlanDefinition(confirmPlan).name} &mdash; {getPlanDefinition(confirmPlan).priceLabel}/mo
                </span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmPlan(null)}
                disabled={saving}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePlanChange(confirmPlan)}
                disabled={saving}
                className={`flex-1 justify-center ${
                  getPlanTierIndex(confirmPlan) > activeTierIndex ? "btn-primary" : "btn-danger"
                }`}
              >
                {saving
                  ? "Processing..."
                  : getPlanTierIndex(confirmPlan) > activeTierIndex
                    ? "Confirm Upgrade"
                    : "Confirm Downgrade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

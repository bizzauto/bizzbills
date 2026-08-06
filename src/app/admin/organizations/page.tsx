"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  _count: {
    users: number;
    invoices: number;
    payments: number;
  };
};

const PLANS = ["free", "silver", "gold", "platinum", "enterprise"];

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  free: { bg: "rgba(107,114,128,0.15)", text: "#6b7280" },
  silver: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
  gold: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  platinum: { bg: "rgba(99,102,241,0.15)", text: "#6366f1" },
  enterprise: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
};

export default function AdminOrganizationsPage() {
  const { data: session, status } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(Array.isArray(data) ? data : []);
      }
    } catch {
      console.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchOrganizations();
    }
  }, [status, fetchOrganizations]);

  const updatePlan = useCallback(
    async (orgId: string, newPlan: string) => {
      setUpdating(orgId);
      try {
        const res = await fetch("/api/admin/organizations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, plan: newPlan }),
        });

        if (res.ok) {
          setOrganizations((prev) =>
            prev.map((org) =>
              org.id === orgId ? { ...org, plan: newPlan } : org
            )
          );
        }
      } catch {
        console.error("Failed to update organization");
      } finally {
        setUpdating(null);
      }
    },
    []
  );

  const role = (session?.user as { role?: string })?.role;

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-muted">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-default">Access Denied</h1>
          <p className="mt-2 text-sm text-muted">
            You need Super Admin privileges to view this page.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-default">
            Organization Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage subscriptions and plans for all organizations
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-[var(--card-border)] bg-[var(--badge-bg)] px-4 py-2 text-sm font-medium text-default transition hover:border-accent/30"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="border-b border-[var(--card-border)] px-6 py-4">
          <h2 className="font-semibold text-default">
            All Organizations ({organizations.length})
          </h2>
        </div>

        {organizations.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted">
            No organizations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-muted">
                  <th className="px-6 py-3 font-medium">Organization</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Users</th>
                  <th className="px-6 py-3 font-medium">Invoices</th>
                  <th className="px-6 py-3 font-medium">Payments</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const planColor = PLAN_COLORS[org.plan] || PLAN_COLORS.free;
                  return (
                    <tr
                      key={org.id}
                      className="border-t border-[var(--card-border)] transition hover:bg-[var(--badge-bg)]"
                    >
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-default">{org.name}</p>
                          <p className="text-xs text-muted">{org.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <select
                          value={org.plan}
                          onChange={(e) => updatePlan(org.id, e.target.value)}
                          disabled={updating === org.id}
                          className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-1.5 text-xs font-medium transition hover:border-accent/30 disabled:opacity-50"
                          style={{
                            background: planColor.bg,
                            color: planColor.text,
                          }}
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3 text-default">
                        {org._count.users}
                      </td>
                      <td className="px-6 py-3 text-default">
                        {org._count.invoices}
                      </td>
                      <td className="px-6 py-3 text-default">
                        {org._count.payments}
                      </td>
                      <td className="px-6 py-3 text-muted">
                        {new Date(org.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/users?orgId=${org.id}`}
                          className="text-sm font-medium text-accent hover:text-accent/80"
                        >
                          View Users
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {PLANS.map((plan) => {
          const count = organizations.filter((o) => o.plan === plan).length;
          const color = PLAN_COLORS[plan];
          return (
            <div
              key={plan}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center"
            >
              <p className="text-sm text-muted">
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </p>
              <p
                className="mt-1 text-2xl font-bold"
                style={{ color: color.text }}
              >
                {count}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

type UserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  orgId: string | null;
  org: { name: string } | null;
};

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
};

type PaymentSummary = {
  id: string;
  orgId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  invoice: { invoiceNumber: string; customerName: string } | null;
};

type ActivityItem = {
  id: string;
  type: "invoice" | "payment";
  title: string;
  subtitle: string;
  amount: number | null;
  status: string;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated" || status === "loading") return;

    const controller = new AbortController();

    Promise.all([
      fetch("/api/admin/users", { signal: controller.signal }),
      fetch("/api/invoices", { signal: controller.signal }),
      fetch("/api/payments", { signal: controller.signal }),
    ])
      .then(async ([usersRes, invoicesRes, paymentsRes]) => {
        const [usersData, invoicesData, paymentsData] = await Promise.all([
          usersRes.json(),
          invoicesRes.json(),
          paymentsRes.json(),
        ]);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [status]);

  const role = (session?.user as { role?: string })?.role;

  /* ── Derived KPIs ── */

  const uniqueOrgIds = useMemo(
    () => new Set(users.map((u) => u.orgId).filter(Boolean)),
    [users],
  );

  const totalRevenue = useMemo(
    () =>
      payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  /* ── Recent Activity (latest 10 invoices + payments merged) ── */

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...invoices.map((inv) => ({
        id: inv.id,
        type: "invoice" as const,
        title: `Invoice #${inv.invoiceNumber}`,
        subtitle: inv.customerName,
        amount: inv.total,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
      ...payments.map((pay) => ({
        id: pay.id,
        type: "payment" as const,
        title: pay.invoice
          ? `Payment for #${pay.invoice.invoiceNumber}`
          : `Payment (${pay.method})`,
        subtitle: pay.invoice?.customerName ?? "Direct payment",
        amount: pay.amount,
        status: pay.status,
        createdAt: pay.createdAt,
      })),
    ];
    return items
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10);
  }, [invoices, payments]);

  /* ── Role color helper ── */

  function roleStyle(roleName: string) {
    switch (roleName) {
      case "SUPER_ADMIN":
        return { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" };
      case "ORG_ADMIN":
        return { bg: "rgba(16,185,129,0.15)", color: "#10b981" };
      case "ACCOUNTANT":
        return { bg: "rgba(99,102,241,0.15)", color: "#6366f1" };
      case "SALES_MANAGER":
        return { bg: "rgba(236,72,153,0.15)", color: "#ec4899" };
      default:
        return { bg: "var(--badge-bg)", color: "var(--muted)" };
    }
  }

  /* ── Access Denied ── */

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-muted">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-default">Access Denied</h1>
          <p className="mt-2 text-sm text-muted">
            You need Super Admin privileges to view this page.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ── KPI cards data ── */

  const kpis = [
    {
      label: "Total Users",
      value: users.length.toLocaleString(),
      accent: "kpi-accent-cyan",
    },
    {
      label: "Organizations",
      value: uniqueOrgIds.size.toLocaleString(),
      accent: "kpi-accent-purple",
    },
    {
      label: "Total Invoices",
      value: invoices.length.toLocaleString(),
      accent: "kpi-accent-amber",
    },
    {
      label: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      accent: "kpi-accent-green",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Platform overview for{" "}
          <span style={{ color: "var(--accent)" }}>
            {session?.user?.name || session?.user?.email}
          </span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.accent}`}>
            <p
              className="section-label"
              style={{ color: "var(--muted)" }}
            >
              {kpi.label}
            </p>
            <p
              className="mt-2 text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* MRR + Active Subscriptions row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card kpi-accent-cyan">
          <p className="section-label" style={{ color: "var(--muted)" }}>
            Monthly Recurring Revenue
          </p>
          <p
            className="mt-2 text-2xl font-bold"
            style={{ color: "var(--accent)" }}
          >
            ₹0.00
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Subscription API not connected
          </p>
        </div>
        <div className="kpi-card kpi-accent-green">
          <p className="section-label" style={{ color: "var(--muted)" }}>
            Active Subscriptions
          </p>
          <p
            className="mt-2 text-2xl font-bold"
            style={{ color: "var(--success)" }}
          >
            0
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Subscription API not connected
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--card-border)" }}
        >
          <h2
            className="font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Recent Activity
          </h2>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Latest {recentActivity.length} events
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div
            className="px-6 py-8 text-center text-sm"
            style={{ color: "var(--muted)" }}
          >
            No activity yet
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {recentActivity.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between px-6 py-3 transition hover:brightness-110"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background:
                        item.type === "invoice"
                          ? "rgba(6,182,212,0.12)"
                          : "rgba(16,185,129,0.12)",
                      color:
                        item.type === "invoice"
                          ? "var(--accent)"
                          : "var(--success)",
                    }}
                  >
                    {item.type === "invoice" ? "INV" : "PAY"}
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.amount !== null && (
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span
                    className={`badge badge-${item.status}`}
                  >
                    {item.status}
                  </span>
                  <span
                    className="hidden text-xs sm:inline"
                    style={{ color: "var(--muted)" }}
                  >
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--card-border)" }}
        >
          <h2
            className="font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            All Users
          </h2>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            Manage users →
          </Link>
        </div>

        {users.length === 0 ? (
          <div
            className="px-6 py-8 text-center text-sm"
            style={{ color: "var(--muted)" }}
          >
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor: "var(--card-border)",
                    color: "var(--muted)",
                  }}
                >
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Organization</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const style = roleStyle(user.role);
                  return (
                    <tr
                      key={user.id}
                      className="border-t transition hover:brightness-110"
                      style={{
                        borderColor: "var(--card-border)",
                      }}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                            style={{
                              background: "var(--badge-bg)",
                              color: "var(--accent)",
                            }}
                          >
                            {(user.name ?? user.email ?? "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span
                            className="font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {user.name || "Unnamed"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3" style={{ color: "var(--muted)" }}>
                        {user.email}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {user.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3" style={{ color: "var(--muted)" }}>
                        {user.org?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3" style={{ color: "var(--muted)" }}>
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

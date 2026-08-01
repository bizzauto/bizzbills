"use client";

import Link from "next/link";
import { SwipeableCards } from "./SwipeableCards";

type DashboardStats = {
  totalRevenue: number;
  pendingInvoices: number;
  recentTransactions: Array<{
    id: string;
    customer: string;
    amount: number;
    status: "paid" | "pending" | "overdue";
    date: string;
  }>;
  quickActions: Array<{
    label: string;
    href: string;
    icon: string;
  }>;
};

const DEFAULT_STATS: DashboardStats = {
  totalRevenue: 0,
  pendingInvoices: 0,
  recentTransactions: [],
  quickActions: [
    { label: "New Invoice", href: "/invoices/new", icon: "📄" },
    { label: "Add Party", href: "/parties/new", icon: "👤" },
    { label: "Record Payment", href: "/payments/new", icon: "💰" },
    { label: "Scan Bill", href: "/scan", icon: "📷" },
  ],
};

export function MobileDashboard({ stats }: { stats?: DashboardStats }) {
  const data = stats || DEFAULT_STATS;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-default">Dashboard</h1>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--badge-bg)] text-lg"
          >
            🔔
          </button>
        </div>
      </div>

      {/* Stats Cards - Swipeable */}
      <div className="px-4 pt-4">
        <SwipeableCards>
          {/* Revenue Card */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-5 text-white">
            <p className="text-sm opacity-80">Total Revenue</p>
            <p className="mt-1 text-3xl font-bold">₹{data.totalRevenue.toLocaleString()}</p>
            <p className="mt-2 text-xs opacity-70">This month</p>
          </div>

          {/* Pending Card */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white">
            <p className="text-sm opacity-80">Pending Invoices</p>
            <p className="mt-1 text-3xl font-bold">{data.pendingInvoices}</p>
            <p className="mt-2 text-xs opacity-70">Awaiting payment</p>
          </div>

          {/* Overdue Card */}
          <div className="rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 p-5 text-white">
            <p className="text-sm opacity-80">Overdue</p>
            <p className="mt-1 text-3xl font-bold">
              {data.recentTransactions.filter((t) => t.status === "overdue").length}
            </p>
            <p className="mt-2 text-xs opacity-70">Needs follow-up</p>
          </div>
        </SwipeableCards>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {data.quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-center transition active:scale-95"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs text-default">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Recent Transactions</h2>
          <Link href="/invoices" className="text-sm text-accent">
            View All
          </Link>
        </div>

        <div className="space-y-3">
          {data.recentTransactions.length === 0 ? (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center">
              <p className="text-muted">No recent transactions</p>
            </div>
          ) : (
            data.recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-default">{transaction.customer}</p>
                  <p className="text-xs text-muted">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-default">
                    ₹{transaction.amount.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      transaction.status === "paid"
                        ? "bg-success/10 text-success"
                        : transaction.status === "pending"
                          ? "bg-warning/10 text-warning"
                          : "bg-danger/10 text-danger"
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

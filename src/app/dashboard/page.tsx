"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
};

type AiInsights = {
  collectionRisk: {
    overdueCount: number;
    totalOverdueBalance: number;
    topRisks: { customerName: string; balance: number; daysOverdue: number }[];
  };
  revenueTrend: {
    last30Days: number;
    previous30Days: number;
    growthRate: number;
  };
  cashFlowHealth: {
    score: number;
    collectionEfficiency: number;
    collected30d: number;
    invoiced30d: number;
  };
  anomalies: { customerName: string; total: number; ratio: number }[];
};

// Document type routes with colors
const DOC_TYPES = [
  { label: "Invoices", href: "/invoices", color: "var(--doc-invoice)", bg: "rgba(99,102,241,0.12)" },
  { label: "Proforma", href: "/proforma-invoices", color: "var(--doc-proforma)", bg: "rgba(168,85,247,0.12)" },
  { label: "Quotations", href: "/quotations", color: "var(--doc-quotation)", bg: "rgba(59,130,246,0.12)" },
  { label: "Challans", href: "/delivery-challan", color: "var(--doc-challan)", bg: "rgba(245,158,11,0.12)" },
  { label: "Credit Notes", href: "/credit-notes", color: "var(--doc-credit)", bg: "rgba(16,185,129,0.12)" },
  { label: "Debit Notes", href: "/debit-notes", color: "var(--doc-debit)", bg: "rgba(239,68,68,0.12)" },
  { label: "Recurring", href: "/recurring-invoices", color: "var(--doc-recurring)", bg: "rgba(236,72,153,0.12)" },
  { label: "Orders", href: "/orders", color: "var(--doc-order)", bg: "rgba(244,63,94,0.12)" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentOrgName, currentOrgCurrency } = useOrg();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/signin"); return; }
    if (status !== "authenticated") return;
    const abort = new AbortController();
    fetch("/api/invoices", { signal: abort.signal })
      .then((r) => r.json())
      .then((d) => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/ai/insights")
      .then((r) => r.json())
      .then((d) => { if (d.insights) setAiInsights(d.insights); })
      .catch(() => {});
    return () => abort.abort();
  }, [status, router]);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const totals = useMemo(() => invoices.reduce((acc, inv) => ({
    revenue: acc.revenue + inv.total,
    sent: acc.sent + (inv.status === "sent" ? inv.total : 0),
    overdue: acc.overdue + (inv.status === "overdue" ? inv.total : 0),
    draft: acc.draft + (inv.status === "draft" ? 1 : 0),
    paid: acc.paid + (inv.status === "paid" ? 1 : 0),
  }), { revenue: 0, sent: 0, overdue: 0, draft: 0, paid: 0 }), [invoices]);

  // Status breakdown for doughnut
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach((inv) => { counts[inv.status] = (counts[inv.status] || 0) + 1; });
    return counts;
  }, [invoices]);

  // Monthly data for line chart
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + inv.total;
    });
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return {
      labels: sorted.map(([k]) => { const [y, m] = k.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]} ${y}`; }),
      data: sorted.map(([, v]) => v),
    };
  }, [invoices]);

  // Top customers
  const topCustomers = useMemo(() => {
    const cust: Record<string, number> = {};
    invoices.forEach((inv) => { cust[inv.customerName] = (cust[inv.customerName] || 0) + inv.total; });
    return Object.entries(cust).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [invoices]);

  const [chartTextColor, setChartTextColor] = useState("#94a3b8");
  const [chartGridColor, setChartGridColor] = useState("rgba(255,255,255,0.05)");
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);

  // Update chart colors on theme change
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setChartTextColor(isLight ? "#64748b" : "#94a3b8");
    setChartGridColor(isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)");
  }, []);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } },
      y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } },
    },
  };

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">Executive dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-full border border-default bg-surface-darker px-4 py-2 text-sm text-muted transition hover:border-default hover:text-default">
              <span className="text-xs">🔍</span> Search&hellip;
              <kbd className="ml-1 rounded border border-default bg-badge px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <div className="rounded-full border border-default bg-accent-subtle px-3 py-2 text-sm text-accent-light">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="kpi-card">
          <span className="kpi-label">Total Revenue</span>
          <span className="kpi-value kpi-accent-cyan">{formatAmount(totals.revenue, currentOrgCurrency)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding</span>
          <span className="kpi-value kpi-accent-amber">{formatAmount(totals.sent, currentOrgCurrency)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Overdue</span>
          <span className="kpi-value kpi-accent-red">{formatAmount(totals.overdue, currentOrgCurrency)}</span>
        </div>
        <div className="kpi-card">
            <span className="kpi-label">Paid / Total</span>
          <span className="kpi-value kpi-accent-emerald">{totals.paid} <span className="text-sm font-normal text-muted">/ {invoices.length}</span></span>
        </div>
      </section>

      {/* Document Type Quick Nav */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {DOC_TYPES.map((dt) => (
          <Link
            key={dt.href}
            href={dt.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-default bg-default px-2 py-3 text-center transition hover:bg-surface-darker"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{ color: dt.color, background: dt.bg }}
            >
              {dt.label.charAt(0)}
            </span>
            <span className="text-[11px] font-medium text-muted leading-tight">{dt.label}</span>
          </Link>
        ))}
      </section>

      {/* Charts Row */}
      {invoices.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Trend */}
          <div className="section-card lg:col-span-2">
            <h2 className="text-lg font-semibold text-default mb-4">Revenue Trend</h2>
            <div className="h-[250px]">
              <Line
                data={{
                  labels: monthlyData.labels.length ? monthlyData.labels : ["No data"],
                  datasets: [{
                    label: "Revenue",
                    data: monthlyData.data.length ? monthlyData.data : [0],
                    borderColor: "#06b6d4",
                    backgroundColor: "rgba(6,182,212,0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: "#06b6d4",
                  }],
                }}
                options={lineOptions}
              />
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="section-card">
            <h2 className="text-lg font-semibold text-default mb-4">Status Breakdown</h2>
            <div className="h-[200px] flex items-center justify-center">
              <Doughnut
                data={{
                  labels: Object.keys(statusCounts),
                  datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ["#64748b", "#f59e0b", "#06b6d4", "#10b981", "#ef4444"],
                    borderWidth: 0,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "65%",
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { color: "#94a3b8", padding: 12, usePointStyle: true, pointStyleWidth: 8 },
                    },
                  },
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* AI Insights */}
      {aiInsights && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Cash Flow Health Score */}
          <div className="section-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted">Cash Flow Health</p>
              <span className="text-xs">🤖</span>
            </div>
            <div className="flex items-end gap-3">
              <span className={`text-3xl font-bold ${aiInsights.cashFlowHealth.score >= 70 ? "text-emerald-300" : aiInsights.cashFlowHealth.score >= 40 ? "text-amber-300" : "text-red-300"}`}>
                {aiInsights.cashFlowHealth.score}
              </span>
              <span className="mb-1 text-xs text-muted">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${aiInsights.cashFlowHealth.score >= 70 ? "bg-emerald-400" : aiInsights.cashFlowHealth.score >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${aiInsights.cashFlowHealth.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Collection efficiency: {aiInsights.cashFlowHealth.collectionEfficiency.toFixed(0)}%
            </p>
          </div>

          {/* Revenue Growth */}
          <div className="section-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted">Revenue Trend</p>
              <span className="text-xs">📈</span>
            </div>
            <p className={`text-3xl font-bold ${aiInsights.revenueTrend.growthRate >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {aiInsights.revenueTrend.growthRate >= 0 ? "+" : ""}{aiInsights.revenueTrend.growthRate.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-muted">
              vs previous 30 days
            </p>
            <div className="mt-2 flex gap-2 text-[10px]">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-muted">
                30d: {formatAmount(aiInsights.revenueTrend.last30Days, currentOrgCurrency)}
              </span>
            </div>
          </div>

          {/* Collection Risk */}
          <div className="section-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted">Overdue Risk</p>
              <span className="text-xs">⚠️</span>
            </div>
            <p className={`text-3xl font-bold ${aiInsights.collectionRisk.overdueCount > 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {aiInsights.collectionRisk.overdueCount}
            </p>
            <p className="mt-1 text-xs text-muted">
              overdue invoices
            </p>
            {aiInsights.collectionRisk.totalOverdueBalance > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-200">
                {formatAmount(aiInsights.collectionRisk.totalOverdueBalance, currentOrgCurrency)} at risk
              </p>
            )}
          </div>

          {/* Anomalies */}
          <div className="section-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted">Anomalies</p>
              <span className="text-xs">🔍</span>
            </div>
            {aiInsights.anomalies.length === 0 ? (
              <>
                <p className="text-3xl font-bold text-emerald-300">0</p>
                <p className="mt-1 text-xs text-muted">No unusual invoices detected</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-amber-300">{aiInsights.anomalies.length}</p>
                <p className="mt-1 text-xs text-muted">unusual invoices detected</p>
                <div className="mt-2 space-y-1">
                  {aiInsights.anomalies.slice(0, 2).map((a, i) => (
                    <p key={i} className="text-[10px] text-amber-200 truncate">
                      {a.customerName}: {formatAmount(a.total, currentOrgCurrency)} ({a.ratio.toFixed(1)}x avg)
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Bottom Grid */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Recent Invoices */}
        <div className="section-card">
          <h2 className="text-xl font-semibold text-default">Recent invoices</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-darker" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="mt-4 rounded-xl border border-default bg-surface-darker p-6 text-center text-sm text-muted">
              No invoices yet.{" "}
              <a href="/billing" className="text-accent-light hover:text-accent">Create your first invoice</a>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {invoices.slice(0, 5).map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-xl border border-default bg-surface-darker p-3 transition hover-brighten"
                >
                  <div>
                    <p className="text-sm font-medium text-default">{inv.customerName}</p>
                    <p className="text-xs text-muted">#{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-default">{formatAmount(inv.total, currentOrgCurrency)}</p>
                    <span className={`badge-${inv.status === "paid" ? "success" : inv.status === "overdue" ? "danger" : inv.status === "draft" ? "default" : "info"} text-xs`}>
                      {inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="section-card">
          <h2 className="text-xl font-semibold text-default">Top Customers</h2>
          {topCustomers.length === 0 ? (
            <div className="mt-4 rounded-xl border border-default bg-surface-darker p-6 text-center text-sm text-muted">No customer data yet.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {topCustomers.map(([name, total], i) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-default bg-surface-darker p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-light">{i + 1}</span>
                    <span className="text-sm font-medium text-default">{name}</span>
                  </div>
                  <span className="text-sm font-semibold text-default">{formatAmount(total, currentOrgCurrency)}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>
    </main>
  );
}

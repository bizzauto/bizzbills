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
    return { labels: sorted.map(([k]) => { const [y, m] = k.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]} ${y}`; }), data: sorted.map(([, v]) => v) };
  }, [invoices]);

  // Top customers
  const topCustomers = useMemo(() => {
    const cust: Record<string, number> = {};
    invoices.forEach((inv) => { cust[inv.customerName] = (cust[inv.customerName] || 0) + inv.total; });
    return Object.entries(cust).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [invoices]);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Executive dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-white">
              🔍 Search… <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Revenue", value: formatAmount(totals.revenue, currentOrgCurrency), color: "text-white" },
          { label: "Collections", value: formatAmount(totals.sent, currentOrgCurrency), color: "text-white" },
          { label: "Overdue", value: formatAmount(totals.overdue, currentOrgCurrency), color: "text-amber-300" },
          { label: "Paid / Total", value: `${totals.paid} / ${invoices.length}`, color: "text-emerald-300" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
            <p className="text-sm text-slate-400">{kpi.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* Charts Row */}
      {invoices.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Trend */}
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend</h2>
            <div className="h-[250px]">
              <Line data={{
                labels: monthlyData.labels.length ? monthlyData.labels : ["No data"],
                datasets: [{ label: "Revenue", data: monthlyData.data.length ? monthlyData.data : [0],
                  borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.1)", fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#06b6d4" }],
              }} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94a3b8" } },
                  y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94a3b8" } },
                },
              }} />
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">Status Breakdown</h2>
            <div className="h-[200px] flex items-center justify-center">
              <Doughnut data={{
                labels: Object.keys(statusCounts),
                datasets: [{ data: Object.values(statusCounts),
                  backgroundColor: ["#64748b", "#f59e0b", "#06b6d4", "#10b981", "#ef4444"],
                  borderWidth: 0, borderRadius: 4 }],
              }} options={{
                responsive: true, maintainAspectRatio: false, cutout: "65%",
                plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", padding: 12, usePointStyle: true, pointStyleWidth: 8 } } },
              }} />
            </div>
          </div>
        </section>
      )}

      {/* Bottom Grid */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Recent Invoices */}
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Recent invoices</h2>
          {loading ? (
            <div className="mt-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-800" />)}</div>
          ) : invoices.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-400">
              No invoices yet. <a href="/billing" className="text-cyan-300 hover:text-cyan-200">Create your first invoice</a>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {invoices.slice(0, 5).map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3 transition hover:bg-slate-900/70">
                  <div>
                    <p className="text-sm font-medium text-white">{inv.customerName}</p>
                    <p className="text-xs text-slate-400">#{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatAmount(inv.total, currentOrgCurrency)}</p>
                    <span className={`text-xs ${inv.status === "paid" ? "text-emerald-300" : inv.status === "overdue" ? "text-red-300" : "text-slate-400"}`}>{inv.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Top Customers</h2>
          {topCustomers.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-400">No customer data yet.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {topCustomers.map(([name, total], i) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-300">{i + 1}</span>
                    <span className="text-sm font-medium text-white">{name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatAmount(total, currentOrgCurrency)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            🤖 AI: Best payment follow-up window is tomorrow morning.
          </div>
        </div>
      </section>
    </main>
  );
}

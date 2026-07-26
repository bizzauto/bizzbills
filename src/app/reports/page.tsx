"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

type SalesSeries = { period: string; count: number; total: number; taxTotal: number; collected: number; uniqueCustomers: number };
type AgingBucket = { label: string; total: number; count: number; invoices: { customerName: string; total: number; dueDate: string; daysOverdue: number }[] };
type DaybookEntry = { id: string; type: string; ref: string; description: string; amount: number; status: string; time: string };
type TopEntry = { name: string; count: number; total: number };

const defaultFrom = "2024-01-01";
const today = () => new Date().toISOString().split("T")[0];

export default function ReportsPage() {
  const { currentOrgCurrency } = useOrg();
  const [tab, setTab] = useState("overview");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today());

  // Sales report
  const [salesData, setSalesData] = useState<SalesSeries[]>([]);
  const [salesTotals, setSalesTotals] = useState({ count: 0, total: 0, collected: 0 });

  // Aging
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [agingTotal, setAgingTotal] = useState(0);

  // Daybook
  const [daybookDate, setDaybookDate] = useState(today());
  const [daybookEntries, setDaybookEntries] = useState<DaybookEntry[]>([]);

  // Top
  const [topCustomers, setTopCustomers] = useState<TopEntry[]>([]);
  const [topProducts, setTopProducts] = useState<TopEntry[]>([]);

  function fetchSales() {
    fetch(`/api/reports/sales?groupBy=month&fromDate=${fromDate}&toDate=${toDate}`).then((r) => r.json()).then((d) => {
      if (d.series) { setSalesData(d.series); setSalesTotals(d.totals); }
    });
  }

  function fetchAging() {
    fetch(`/api/reports/aging?asOfDate=${toDate}`).then((r) => r.json()).then((d) => {
      if (d.buckets) { setAgingData(d.buckets); setAgingTotal(d.grandTotal); }
    });
  }

  function fetchDaybook() {
    fetch(`/api/reports/daybook?date=${daybookDate}`).then((r) => r.json()).then((d) => {
      if (d.entries) setDaybookEntries(d.entries);
    });
  }

  function fetchTop() {
    fetch(`/api/reports/top?limit=5&fromDate=${fromDate}&toDate=${toDate}`).then((r) => r.json()).then((d) => {
      if (d.topCustomers) { setTopCustomers(d.topCustomers); setTopProducts(d.topProducts); }
    });
  }

  useEffect(() => { fetchSales(); fetchAging(); fetchTop(); }, [fromDate, toDate]);
  useEffect(() => { fetchDaybook(); }, [daybookDate]);

  const chartColors = ["#22d3ee", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#f472b6"];

  const barChartData = {
    labels: salesData.map((s) => s.period),
    datasets: [
      { label: "Revenue", data: salesData.map((s) => s.total), backgroundColor: "rgba(34, 211, 238, 0.6)", borderColor: "#22d3ee", borderWidth: 1 },
      { label: "Collected", data: salesData.map((s) => s.collected), backgroundColor: "rgba(52, 211, 153, 0.6)", borderColor: "#34d399", borderWidth: 1 },
    ],
  };

  const pieChartData = {
    labels: agingData.map((b) => b.label),
    datasets: [{ data: agingData.map((b) => b.total), backgroundColor: chartColors.slice(0, agingData.length), borderWidth: 0 }],
  };

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Analytics</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Reports & Analytics</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {["overview", "sales", "aging", "daybook", "top"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"
                }`}>{t}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Date range filters */}
      <div className="flex flex-wrap gap-3 items-center rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4 backdrop-blur">
        <label className="text-xs text-slate-400"><span className="block mb-0.5">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" /></label>
        <label className="text-xs text-slate-400"><span className="block mb-0.5">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" /></label>
        <button onClick={() => { fetchSales(); fetchAging(); fetchTop(); }}
          className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
          Refresh
        </button>
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs text-slate-400">Total Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-white">{formatAmount(salesTotals.total, currentOrgCurrency)}</p>
              <p className="text-xs text-slate-500">{salesTotals.count} invoices</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs text-slate-400">Collected</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{formatAmount(salesTotals.collected, currentOrgCurrency)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs text-slate-400">Outstanding (Aging)</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">{formatAmount(agingTotal, currentOrgCurrency)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
              <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
              {salesData.length > 0 ? (
                <div className="mt-4 h-64"><Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#94a3b8" } } }, scales: { x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }, y: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } } } }} /></div>
              ) : <p className="mt-4 text-sm text-slate-500">No sales data for selected period.</p>}
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
              <h2 className="text-lg font-semibold text-white">Aging Distribution</h2>
              {agingData.some((b) => b.total > 0) ? (
                <div className="mt-4 h-64"><Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", padding: 12 } } } }} /></div>
              ) : <p className="mt-4 text-sm text-slate-500">No outstanding invoices.</p>}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {topCustomers.length > 0 && (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-white">Top Customers</h2>
                <div className="mt-3 space-y-2">
                  {topCustomers.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-4">#{i + 1}</span>
                        <span className="text-sm text-white">{c.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white">{formatAmount(c.total, currentOrgCurrency)}</span>
                        <span className="ml-2 text-xs text-slate-500">({c.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topProducts.length > 0 && (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-white">Top Products</h2>
                <div className="mt-3 space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-4">#{i + 1}</span>
                        <span className="text-sm text-white">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white">{formatAmount(p.total, currentOrgCurrency)}</span>
                        <span className="ml-2 text-xs text-slate-500">({p.count} units)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "sales" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Sales Report</h2>
            <button onClick={() => {
              const csv = "Period,Invoices,Revenue,Tax,Collected,Unique Customers\n" + salesData.map((s) => `${s.period},${s.count},${s.total},${s.taxTotal},${s.collected},${s.uniqueCustomers}`).join("\n");
              const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "sales-report.csv"; a.click(); URL.revokeObjectURL(url);
            }} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10">
              Export CSV
            </button>
          </div>
          {salesData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Period</th><th className="p-3 font-medium">Invoices</th>
                  <th className="p-3 font-medium text-right">Revenue</th><th className="p-3 font-medium text-right">Tax</th>
                  <th className="p-3 font-medium text-right">Collected</th><th className="p-3 font-medium text-right">Customers</th>
                </tr></thead>
                <tbody>
                  {salesData.map((s) => (
                    <tr key={s.period} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 text-white">{s.period}</td>
                      <td className="p-3 text-slate-300">{s.count}</td>
                      <td className="p-3 text-right text-white">{formatAmount(s.total, currentOrgCurrency)}</td>
                      <td className="p-3 text-right text-slate-300">{formatAmount(s.taxTotal, currentOrgCurrency)}</td>
                      <td className="p-3 text-right text-emerald-300">{formatAmount(s.collected, currentOrgCurrency)}</td>
                      <td className="p-3 text-right text-slate-300">{s.uniqueCustomers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No data for selected period.</p>}
        </div>
      )}

      {tab === "aging" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white mb-4">Party Aging Report</h2>
          <p className="text-sm text-slate-400 mb-4">Outstanding: {formatAmount(agingTotal, currentOrgCurrency)} as at {toDate}</p>
          {agingData.some((b) => b.total > 0) ? (
            <div className="space-y-4">
              {agingData.filter((b) => b.total > 0).map((b) => (
                <div key={b.label} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-white">{b.label}</h3>
                    <span className="text-sm font-semibold text-amber-300">{formatAmount(b.total, currentOrgCurrency)} ({b.count})</span>
                  </div>
                  {b.invoices.map((inv, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-400 py-1 border-b border-white/5 last:border-0">
                      <span>{inv.customerName}</span>
                      <span>{formatAmount(inv.total, currentOrgCurrency)} — {inv.daysOverdue}d overdue</span>
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={() => {
                const csv = "Bucket,Customer,Outstanding,Days Overdue\n" + agingData.filter((b) => b.invoices.length > 0).flatMap((b) => b.invoices.map((inv) => `${b.label},${inv.customerName},${inv.total},${inv.daysOverdue}`)).join("\n");
                const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "aging-report.csv"; a.click(); URL.revokeObjectURL(url);
              }} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10 mt-2">
                Export CSV
              </button>
            </div>
          ) : <p className="text-sm text-slate-500">No outstanding invoices.</p>}
        </div>
      )}

      {tab === "daybook" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Daybook</h2>
            <label className="text-xs text-slate-400 flex items-center gap-2">
              Date:
              <input type="date" value={daybookDate} onChange={(e) => setDaybookDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none" />
            </label>
          </div>
          {daybookEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Time</th><th className="p-3 font-medium">Type</th><th className="p-3 font-medium">Ref</th>
                  <th className="p-3 font-medium">Description</th><th className="p-3 font-medium text-right">Amount</th><th className="p-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {daybookEntries.map((e) => (
                    <tr key={`${e.type}-${e.id}`} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 text-xs text-slate-500">{new Date(e.time).toLocaleTimeString()}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        e.type === "Invoice" ? "bg-cyan-500/10 text-cyan-300" :
                        e.type === "Credit Note" ? "bg-amber-500/10 text-amber-300" :
                        e.type === "Payment" ? "bg-emerald-500/10 text-emerald-300" :
                        "bg-purple-500/10 text-purple-300"
                      }`}>{e.type}</span></td>
                      <td className="p-3 font-mono text-xs text-white">{e.ref}</td>
                      <td className="p-3 text-slate-300">{e.description}</td>
                      <td className={`p-3 text-right font-medium ${e.amount < 0 ? "text-red-300" : "text-white"}`}>
                        {e.amount !== 0 ? formatAmount(Math.abs(e.amount), currentOrgCurrency) : "—"}
                      </td>
                      <td className="p-3"><span className="text-xs capitalize text-slate-400">{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No transactions for this date.</p>}
        </div>
      )}

      {tab === "top" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Top Customers</h2>
            <div className="mt-3 space-y-2">
              {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-bold text-cyan-300">{i + 1}</span>
                    <div><p className="text-sm text-white">{c.name}</p><p className="text-xs text-slate-500">{c.count} invoices</p></div>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatAmount(c.total, currentOrgCurrency)}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No data.</p>}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Top Products</h2>
            <div className="mt-3 space-y-2">
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-300">{i + 1}</span>
                    <div><p className="text-sm text-white">{p.name}</p><p className="text-xs text-slate-500">{p.count} units</p></div>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatAmount(p.total, currentOrgCurrency)}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No data.</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

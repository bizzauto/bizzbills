"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/currency";
import { useOrg } from "@/components/OrgProvider";

type Period = {
  label: string;
  inflow: number;
  outflow: number;
  balance: number;
};

type CashFlowData = {
  periods: Period[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    daysUntilCrunch: number | null;
  };
};

const RANGE_OPTIONS = [
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
];

export default function CashFlowPage() {
  const { currentOrgCurrency } = useOrg();
  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/cash-flow?days=${rangeDays}`)
      .then((r) => r.json())
      .then((d: CashFlowData) => {
        setData(d && !(d as any).error ? d : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rangeDays]);

  const maxAbs = data
    ? Math.max(
        1,
        ...data.periods.map((p) => Math.max(p.inflow, p.outflow))
      )
    : 1;

  function barWidth(value: number): string {
    return `${(value / maxAbs) * 100}%`;
  }

  function handleExportCSV() {
    if (!data) return;
    const header = "Period,Inflow,Outflow,Balance\n";
    const rows = data.periods
      .map((p) => `${p.label},${p.inflow},${p.outflow},${p.balance}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${rangeDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Forecasting
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Cash Flow Forecast
            </h1>
            <p className="mt-1 text-sm text-muted">
              Projected inflows and outflows based on outstanding invoices,
              recurring schedules, and upcoming expenses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRangeDays(opt.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  rangeDays === opt.value
                    ? "bg-cyan-500 text-slate-950"
                    : "border border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={handleExportCSV}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
            >
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="section-card">
          <p className="text-sm text-muted">Loading cash flow data...</p>
        </section>
      ) : !data ? (
        <section className="section-card">
          <p className="text-sm text-muted">
            Failed to load cash flow data. Please try again.
          </p>
        </section>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="kpi-card">
              <p className="text-xs text-muted">Total Inflow</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {formatAmount(data.summary.totalInflow, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Expected payments in {rangeDays} days
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Total Outflow</p>
              <p className="mt-1 text-2xl font-semibold text-red-400">
                {formatAmount(data.summary.totalOutflow, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Scheduled expenses in {rangeDays} days
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Net Cash Flow</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  data.summary.netFlow >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {data.summary.netFlow >= 0 ? "+" : ""}
                {formatAmount(data.summary.netFlow, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.summary.netFlow >= 0 ? "Surplus" : "Deficit"} projected
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Days Until Cash Crunch</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  data.summary.daysUntilCrunch === null
                    ? "text-slate-400"
                    : data.summary.daysUntilCrunch > 30
                      ? "text-emerald-400"
                      : data.summary.daysUntilCrunch > 7
                        ? "text-amber-400"
                        : "text-red-400"
                }`}
              >
                {data.summary.daysUntilCrunch === null
                  ? "N/A"
                  : `${data.summary.daysUntilCrunch}d`}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.summary.daysUntilCrunch === null
                  ? "No crunch projected"
                  : data.summary.daysUntilCrunch > 30
                    ? "Healthy runway"
                    : "Monitor closely"}
              </p>
            </div>
          </div>

          {/* CSS Bar Chart */}
          <section className="section-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-default">
                Weekly Cash Flow
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-muted">Inflow</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="text-muted">Outflow</span>
                </span>
              </div>
            </div>

            {data.periods.some((p) => p.inflow > 0 || p.outflow > 0) ? (
              <div className="space-y-3">
                {data.periods.map((p) => (
                  <div key={p.label}>
                    <p className="mb-1 text-xs text-muted">{p.label}</p>
                    <div className="space-y-1">
                      {p.inflow > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 rounded-r bg-emerald-400/70 transition-all duration-300"
                            style={{ width: barWidth(p.inflow) }}
                          />
                          <span className="whitespace-nowrap text-xs text-emerald-400">
                            {formatAmount(p.inflow, currentOrgCurrency)}
                          </span>
                        </div>
                      )}
                      {p.outflow > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 rounded-r bg-red-400/70 transition-all duration-300"
                            style={{ width: barWidth(p.outflow) }}
                          />
                          <span className="whitespace-nowrap text-xs text-red-400">
                            {formatAmount(p.outflow, currentOrgCurrency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No projected cash flow activity in this period.
              </p>
            )}
          </section>

          {/* Detail Table */}
          <section className="section-card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-default">
                Period Breakdown
              </h2>
            </div>

            {data.periods.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-muted">
                      <th className="p-3 font-medium">Period</th>
                      <th className="p-3 font-medium text-right">Inflow</th>
                      <th className="p-3 font-medium text-right">Outflow</th>
                      <th className="p-3 font-medium text-right">
                        Running Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.periods.map((p) => (
                      <tr
                        key={p.label}
                        className="border-t border-white/5 hover-brighten"
                      >
                        <td className="p-3 text-default">{p.label}</td>
                        <td className="p-3 text-right text-emerald-400">
                          {p.inflow > 0
                            ? formatAmount(p.inflow, currentOrgCurrency)
                            : "---"}
                        </td>
                        <td className="p-3 text-right text-red-400">
                          {p.outflow > 0
                            ? formatAmount(p.outflow, currentOrgCurrency)
                            : "---"}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            p.balance >= 0 ? "text-default" : "text-red-400"
                          }`}
                        >
                          {formatAmount(p.balance, currentOrgCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-semibold">
                      <td className="p-3 text-default">Total</td>
                      <td className="p-3 text-right text-emerald-400">
                        {formatAmount(
                          data.summary.totalInflow,
                          currentOrgCurrency
                        )}
                      </td>
                      <td className="p-3 text-right text-red-400">
                        {formatAmount(
                          data.summary.totalOutflow,
                          currentOrgCurrency
                        )}
                      </td>
                      <td
                        className={`p-3 text-right ${
                          data.summary.netFlow >= 0
                            ? "text-default"
                            : "text-red-400"
                        }`}
                      >
                        {data.summary.netFlow >= 0 ? "+" : ""}
                        {formatAmount(
                          data.summary.netFlow,
                          currentOrgCurrency
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No periods to display for this range.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

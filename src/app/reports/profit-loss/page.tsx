"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/currency";
import { useOrg } from "@/components/OrgProvider";

type MonthData = {
  label: string;
  key: string;
  income: number;
  expenses: number;
  tax: number;
  netProfit: number;
};

type Totals = {
  income: number;
  expenses: number;
  tax: number;
  netProfit: number;
};

type ApiResponse = {
  months: MonthData[];
  totals: Totals;
};

function getDefaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  return d.toISOString().split("T")[0];
}

function getDefaultToDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ProfitLossPage() {
  const { currentOrgCurrency } = useOrg();
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/profit-loss?fromDate=${fromDate}&toDate=${toDate}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fromDate, toDate]);

  const maxAbs = data
    ? Math.max(
        1,
        ...data.months.map((m) =>
          Math.max(Math.abs(m.income), Math.abs(m.expenses)),
        ),
      )
    : 1;

  function barWidth(value: number): string {
    return `${(Math.abs(value) / maxAbs) * 100}%`;
  }

  const profitMargin =
    data && data.totals.income > 0
      ? ((data.totals.netProfit / data.totals.income) * 100).toFixed(1)
      : "0.0";

  function handleExportCSV() {
    if (!data) return;
    const header = "Month,Revenue,Expenses,GST/Tax,Net Profit\n";
    const rows = data.months
      .map(
        (m) =>
          `${m.label},${m.income},${m.expenses},${m.tax},${m.netProfit}`,
      )
      .join("\n");
    const totalRow = `\nTotals,${data.totals.income},${data.totals.expenses},${data.totals.tax},${data.totals.netProfit}`;
    const blob = new Blob([header + rows + totalRow], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${fromDate}-to-${toDate}.csv`;
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
              Financial Reports
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Profit &amp; Loss Report
            </h1>
            <p className="mt-1 text-sm text-muted">
              Monthly breakdown of revenue, expenses, tax, and net profit for the selected period.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted" htmlFor="pl-from">
                From
              </label>
              <input
                id="pl-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-default focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted" htmlFor="pl-to">
                To
              </label>
              <input
                id="pl-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-default focus:border-cyan-500 focus:outline-none"
              />
            </div>
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
          <p className="text-sm text-muted">Loading profit &amp; loss data...</p>
        </section>
      ) : !data ? (
        <section className="section-card">
          <p className="text-sm text-muted">
            Failed to load profit &amp; loss data. Please try again.
          </p>
        </section>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="kpi-card">
              <p className="text-xs text-muted">Total Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {formatAmount(data.totals.income, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Payments received in period
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Total Expenses</p>
              <p className="mt-1 text-2xl font-semibold text-red-400">
                {formatAmount(data.totals.expenses, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                All recorded expenses
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Net Profit</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  data.totals.netProfit >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {data.totals.netProfit >= 0 ? "+" : ""}
                {formatAmount(data.totals.netProfit, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.totals.netProfit >= 0 ? "Profitable period" : "Loss in period"}
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Profit Margin</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  Number(profitMargin) >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {profitMargin}%
              </p>
              <p className="mt-0.5 text-xs text-muted">
                GST/Tax collected: {formatAmount(data.totals.tax, currentOrgCurrency)}
              </p>
            </div>
          </div>

          {/* CSS Bar Chart */}
          <section className="section-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-default">
                Monthly Revenue vs Expenses
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-muted">Revenue</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="text-muted">Expenses</span>
                </span>
              </div>
            </div>

            {data.months.some((m) => m.income > 0 || m.expenses > 0) ? (
              <div className="space-y-3">
                {data.months.map((m) => (
                  <div key={m.key}>
                    <p className="mb-1 text-xs text-muted">{m.label}</p>
                    <div className="space-y-1">
                      {m.income > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 rounded-r bg-emerald-400/70 transition-all duration-300"
                            style={{ width: barWidth(m.income) }}
                          />
                          <span className="whitespace-nowrap text-xs text-emerald-400">
                            {formatAmount(m.income, currentOrgCurrency)}
                          </span>
                        </div>
                      )}
                      {m.expenses > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 rounded-r bg-red-400/70 transition-all duration-300"
                            style={{ width: barWidth(m.expenses) }}
                          />
                          <span className="whitespace-nowrap text-xs text-red-400">
                            {formatAmount(m.expenses, currentOrgCurrency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No revenue or expense data in this period.
              </p>
            )}
          </section>

          {/* Monthly Breakdown Table */}
          <section className="section-card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-default">
                Monthly Breakdown
              </h2>
            </div>

            {data.months.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-muted">
                      <th className="p-3 font-medium">Month</th>
                      <th className="p-3 font-medium text-right">Revenue</th>
                      <th className="p-3 font-medium text-right">Expenses</th>
                      <th className="p-3 font-medium text-right">GST/Tax</th>
                      <th className="p-3 font-medium text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((m) => (
                      <tr
                        key={m.key}
                        className="border-t border-white/5 hover-brighten"
                      >
                        <td className="p-3 text-default">{m.label}</td>
                        <td className="p-3 text-right text-emerald-400">
                          {m.income > 0
                            ? formatAmount(m.income, currentOrgCurrency)
                            : "---"}
                        </td>
                        <td className="p-3 text-right text-red-400">
                          {m.expenses > 0
                            ? formatAmount(m.expenses, currentOrgCurrency)
                            : "---"}
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {m.tax > 0
                            ? formatAmount(m.tax, currentOrgCurrency)
                            : "---"}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            m.netProfit >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {m.netProfit >= 0 ? "+" : ""}
                          {formatAmount(m.netProfit, currentOrgCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-semibold">
                      <td className="p-3 text-default">Total</td>
                      <td className="p-3 text-right text-emerald-400">
                        {formatAmount(data.totals.income, currentOrgCurrency)}
                      </td>
                      <td className="p-3 text-right text-red-400">
                        {formatAmount(data.totals.expenses, currentOrgCurrency)}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {formatAmount(data.totals.tax, currentOrgCurrency)}
                      </td>
                      <td
                        className={`p-3 text-right ${
                          data.totals.netProfit >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {data.totals.netProfit >= 0 ? "+" : ""}
                        {formatAmount(data.totals.netProfit, currentOrgCurrency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No data for the selected date range.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

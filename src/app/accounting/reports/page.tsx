"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";
import { useOrg } from "@/components/OrgProvider";

type TrialBalanceEntry = {
  id: string;
  code: string;
  name: string;
  type: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  isBalanceSheet: boolean;
};

type ProfitLossEntry = {
  code: string;
  name: string;
  type: string;
  amount: number;
};

type BalanceSheetEntry = {
  code: string;
  name: string;
  balance: number;
};

export default function ReportsPage() {
  const { currentOrgCurrency } = useOrg();
  const [reportType, setReportType] = useState("trial-balance");
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generateReport() {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({ type: reportType, fromDate, toDate });
      const res = await fetch(`/api/accounting/reports?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      setMessage("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!data) return;

    let csv = "";

    if (reportType === "trial-balance" && data) {
      csv = "Code,Name,Type,Debits,Credits,Balance,Balance Sheet\n";
      for (const row of data) {
        csv += `${row.code},${row.name},${row.type},${row.debitTotal},${row.creditTotal},${row.balance},${row.isBalanceSheet}\n`;
      }
    } else if (reportType === "profit-loss" && data) {
      csv = "Code,Name,Type,Amount\n";
      for (const row of data.accounts ?? []) {
        csv += `${row.code},${row.name},${row.type},${row.amount}\n`;
      }
      csv += `\nTOTAL INCOME,,${data.totalIncome}\n`;
      csv += `TOTAL EXPENSES,,${data.totalExpenses}\n`;
      csv += `NET INCOME,,${data.netIncome}\n`;
    } else if (reportType === "balance-sheet" && data) {
      csv = "Code,Name,Balance\n";
      csv += `ASSETS TOTAL,,${data.totalAssets}\n`;
      for (const row of data.assets ?? []) {
        csv += `${row.code},${row.name},${row.balance}\n`;
      }
      csv += `\nLIABILITIES TOTAL,,${data.totalLiabilities}\n`;
      for (const row of data.liabilities ?? []) {
        csv += `${row.code},${row.name},${row.balance}\n`;
      }
      csv += `\nEQUITY TOTAL,,${data.totalEquity}\n`;
      for (const row of data.equity ?? []) {
        csv += `${row.code},${row.name},${row.balance}\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportType}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section>
        <h1 className="text-2xl font-semibold text-white">Financial Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Generate and export financial statements.</p>
      </section>

      {message && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <label className="text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Report Type</span>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50">
            <option value="trial-balance">Trial Balance</option>
            <option value="profit-loss">Profit & Loss</option>
            <option value="balance-sheet">Balance Sheet</option>
            <option value="cash-flow">Cash Flow</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
        </label>
        <label className="text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
        </label>
        <button onClick={generateReport} disabled={loading} className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
          {loading ? "Generating…" : "Generate Report"}
        </button>
        {data && (
          <button onClick={downloadCSV} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
            Export CSV
          </button>
        )}
      </div>

      {data && reportType === "trial-balance" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Trial Balance</h2>
            <p className="text-sm text-slate-400">As at {toDate}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Debits</th>
                  <th className="px-4 py-3 font-medium text-right">Credits</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((row: TrialBalanceEntry) => (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-slate-300">{row.code}</td>
                    <td className="px-4 py-3 text-white">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-medium text-slate-300">{row.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-300">{row.debitTotal > 0 ? formatAmount(row.debitTotal, currentOrgCurrency) : "—"}</td>
                    <td className="px-4 py-3 text-right text-red-300">{row.creditTotal > 0 ? formatAmount(row.creditTotal, currentOrgCurrency) : "—"}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{formatAmount(row.balance, currentOrgCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/10 text-sm text-slate-400">
            Total Debits: <span className="text-white font-medium">{formatAmount(data.reduce((s: number, r: TrialBalanceEntry) => s + r.debitTotal, 0), currentOrgCurrency)}</span> |
            Total Credits: <span className="text-white font-medium">{formatAmount(data.reduce((s: number, r: TrialBalanceEntry) => s + r.creditTotal, 0), currentOrgCurrency)}</span>
          </div>
        </div>
      )}

      {data && reportType === "profit-loss" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white mb-4">Profit & Loss Statement</h2>
          <p className="text-sm text-slate-400 mb-6">{fromDate} — {toDate}</p>
          <div className="space-y-2">
            {data.accounts?.map((row: ProfitLossEntry) => (
              <div key={row.code} className="flex justify-between text-sm py-1.5 border-b border-white/5">
                <span className="text-slate-300">{row.code} — {row.name}</span>
                <span className={`font-medium ${row.type === "INCOME" ? "text-emerald-300" : "text-red-300"}`}>{formatAmount(row.amount, currentOrgCurrency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2 pt-4 border-t border-white/10">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Total Income</span><span className="text-emerald-300 font-medium">{formatAmount(data.totalIncome ?? 0, currentOrgCurrency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Total Expenses</span><span className="text-red-300 font-medium">{formatAmount(data.totalExpenses ?? 0, currentOrgCurrency)}</span></div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10"><span className="text-white font-semibold">Net Income</span><span className={`font-semibold ${data.netIncome >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatAmount(data.netIncome ?? 0, currentOrgCurrency)}</span></div>
          </div>
        </div>
      )}

      {data && reportType === "balance-sheet" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white mb-4">Balance Sheet</h2>
          <p className="text-sm text-slate-400 mb-6">As at {toDate}</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">ASSETS</h3>
              <div className="space-y-1">
                {data.assets?.map((row: BalanceSheetEntry) => (
                  <div key={row.code} className="flex justify-between text-sm"><span className="text-slate-300">{row.code} — {row.name}</span><span className="text-white">{formatAmount(row.balance, currentOrgCurrency)}</span></div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm font-semibold"><span>Total Assets</span><span className="text-white">{formatAmount(data.totalAssets ?? 0, currentOrgCurrency)}</span></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">LIABILITIES</h3>
              <div className="space-y-1">
                {data.liabilities?.map((row: BalanceSheetEntry) => (
                  <div key={row.code} className="flex justify-between text-sm"><span className="text-slate-300">{row.code} — {row.name}</span><span className="text-white">{formatAmount(row.balance, currentOrgCurrency)}</span></div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm font-semibold"><span>Total Liabilities</span><span className="text-white">{formatAmount(data.totalLiabilities ?? 0, currentOrgCurrency)}</span></div>
              <h3 className="text-sm font-semibold text-white mt-6 mb-3">EQUITY</h3>
              <div className="space-y-1">
                {data.equity?.map((row: BalanceSheetEntry) => (
                  <div key={row.code} className="flex justify-between text-sm"><span className="text-slate-300">{row.code} — {row.name}</span><span className="text-white">{formatAmount(row.balance, currentOrgCurrency)}</span></div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm font-semibold"><span>Total Equity</span><span className="text-white">{formatAmount(data.totalEquity ?? 0, currentOrgCurrency)}</span></div>
            </div>
          </div>
        </div>
      )}

      {data && reportType === "cash-flow" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white mb-4">Cash Flow Statement</h2>
          <p className="text-sm text-slate-400 mb-6">{fromDate} — {toDate}</p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-white/5"><span className="text-slate-300">Operating Activities</span><span className={`font-medium ${data.operatingCashFlow >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatAmount(data.operatingCashFlow, currentOrgCurrency)}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5"><span className="text-slate-300">Investing Activities</span><span className={`font-medium ${data.investingCashFlow >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatAmount(data.investingCashFlow, currentOrgCurrency)}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5"><span className="text-slate-300">Financing Activities</span><span className={`font-medium ${data.financingCashFlow >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatAmount(data.financingCashFlow, currentOrgCurrency)}</span></div>
            <div className="flex justify-between text-sm pt-3 border-t-2 border-white/10 font-semibold"><span>Net Change in Cash</span><span className="text-white">{formatAmount(data.operatingCashFlow + data.investingCashFlow + data.financingCashFlow, currentOrgCurrency)}</span></div>
          </div>
        </div>
      )}
    </main>
  );
}
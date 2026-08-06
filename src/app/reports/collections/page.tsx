"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/currency";
import { useOrg } from "@/components/OrgProvider";

type Prediction = {
  customerId: string;
  customerName: string;
  outstanding: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendation: string;
  totalInvoices: number;
  totalPayments: number;
  avgDaysToPay: number | null;
  latePayments: number;
  lastPaymentDate: string | null;
};

type Summary = {
  totalOutstanding: number;
  highRiskCount: number;
  highRiskAmount: number;
  avgRiskScore: number;
  totalCustomers: number;
};

type ApiResponse = {
  predictions: Prediction[];
  summary: Summary;
};

const TABS = [
  { label: "All", value: "all" },
  { label: "Low Risk", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
] as const;

function riskBadgeClass(level: string): string {
  switch (level) {
    case "low": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    case "medium": return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
    case "critical": return "bg-red-500/20 text-red-400 border border-red-500/30";
    default: return "bg-white/10 text-slate-300 border border-white/10";
  }
}

function riskBarColor(score: number): string {
  if (score <= 30) return "bg-emerald-400";
  if (score <= 60) return "bg-amber-400";
  if (score <= 80) return "bg-orange-400";
  return "bg-red-400";
}

export default function CollectionsPredictionPage() {
  const { currentOrgCurrency } = useOrg();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    const url = activeTab !== "all"
      ? `/api/reports/collections-prediction?riskLevel=${activeTab}`
      : "/api/reports/collections-prediction";
    fetch(url)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setData(d && !(d as any).error ? d : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              AI Analytics
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Collections Prediction
            </h1>
            <p className="mt-1 text-sm text-muted">
              AI-powered risk scoring for outstanding invoices. Identify
              customers likely to delay payment and prioritize collection
              efforts.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="section-card">
          <p className="text-sm text-muted">Loading prediction data...</p>
        </section>
      ) : !data ? (
        <section className="section-card">
          <p className="text-sm text-muted">
            Failed to load prediction data. Please try again.
          </p>
        </section>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="kpi-card">
              <p className="text-xs text-muted">Total Outstanding</p>
              <p className="mt-1 text-2xl font-semibold text-default">
                {formatAmount(data.summary.totalOutstanding, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Across {data.summary.totalCustomers} customer{data.summary.totalCustomers !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">High Risk Amount</p>
              <p className="mt-1 text-2xl font-semibold text-red-400">
                {formatAmount(data.summary.highRiskAmount, currentOrgCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.summary.highRiskCount} customer{data.summary.highRiskCount !== 1 ? "s" : ""} above 60 risk score
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Predicted Recoverable</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {formatAmount(
                  data.summary.totalOutstanding - data.summary.highRiskAmount,
                  currentOrgCurrency,
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Low and medium risk customers
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs text-muted">Avg Risk Score</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  data.summary.avgRiskScore <= 30
                    ? "text-emerald-400"
                    : data.summary.avgRiskScore <= 60
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {data.summary.avgRiskScore}/100
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.summary.avgRiskScore <= 30
                  ? "Healthy portfolio"
                  : data.summary.avgRiskScore <= 60
                    ? "Moderate risk"
                    : "Portfolio needs attention"}
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <section className="section-card">
            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    activeTab === tab.value
                      ? "bg-cyan-500 text-slate-950"
                      : "border border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {/* Predictions Table */}
          <section className="section-card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-default">
                Customer Risk Analysis
              </h2>
              <p className="text-xs text-muted">
                {data.predictions.length} customer{data.predictions.length !== 1 ? "s" : ""} shown
              </p>
            </div>

            {data.predictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-muted">
                      <th className="p-3 font-medium">Customer</th>
                      <th className="p-3 font-medium text-right">Outstanding</th>
                      <th className="p-3 font-medium">Risk Score</th>
                      <th className="p-3 font-medium">Risk Level</th>
                      <th className="p-3 font-medium">Recommendation</th>
                      <th className="p-3 font-medium">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.predictions.map((pred) => (
                      <tr
                        key={pred.customerId}
                        className="border-t border-white/5 hover-brighten"
                      >
                        <td className="p-3 text-default font-medium">
                          {pred.customerName}
                        </td>
                        <td className="p-3 text-right text-default">
                          {formatAmount(pred.outstanding, currentOrgCurrency)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${riskBarColor(pred.riskScore)} transition-all duration-300`}
                                style={{ width: `${pred.riskScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted">
                              {pred.riskScore}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${riskBadgeClass(pred.riskLevel)}`}
                          >
                            {pred.riskLevel.charAt(0).toUpperCase() + pred.riskLevel.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-300">
                          {pred.recommendation}
                        </td>
                        <td className="p-3 text-sm text-muted">
                          {pred.lastPaymentDate ?? "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">
                {activeTab !== "all"
                  ? `No customers in the "${activeTab}" risk category.`
                  : "No outstanding invoices found. All customers are up to date."}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

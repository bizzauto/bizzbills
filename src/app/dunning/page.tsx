"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type SeverityBucket = "gentle" | "firm" | "urgent" | "final";

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  outstanding: number;
  dueDate: string;
  daysOverdue: number;
  severity: SeverityBucket;
  status: string;
}

interface DunningSummary {
  totalOverdue: number;
  countBySeverity: {
    gentle: number;
    firm: number;
    urgent: number;
    final: number;
  };
}

interface DunningData {
  invoices: OverdueInvoice[];
  summary: DunningSummary;
}

type FilterTab = "all" | "1-7" | "8-30" | "31-60" | "60+";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "1-7", label: "1-7 Days" },
  { key: "8-30", label: "8-30 Days" },
  { key: "31-60", label: "31-60 Days" },
  { key: "60+", label: "60+ Days" },
];

function filterByTab(invoices: OverdueInvoice[], tab: FilterTab): OverdueInvoice[] {
  if (tab === "all") return invoices;
  if (tab === "1-7") return invoices.filter((inv) => inv.daysOverdue <= 7);
  if (tab === "8-30") return invoices.filter((inv) => inv.daysOverdue >= 8 && inv.daysOverdue <= 30);
  if (tab === "31-60") return invoices.filter((inv) => inv.daysOverdue >= 31 && inv.daysOverdue <= 60);
  return invoices.filter((inv) => inv.daysOverdue >= 61);
}

function severityBadgeClass(severity: SeverityBucket): string {
  switch (severity) {
    case "gentle":
      return "badge-sent";
    case "firm":
      return "badge-pending";
    case "urgent":
      return "badge-overdue";
    case "final":
      return "badge-cancelled";
  }
}

function severityLabel(severity: SeverityBucket): string {
  switch (severity) {
    case "gentle":
      return "Gentle";
    case "firm":
      return "Firm";
    case "urgent":
      return "Urgent";
    case "final":
      return "Final Notice";
  }
}

function avgDaysOverdue(invoices: OverdueInvoice[]): number {
  if (invoices.length === 0) return 0;
  const total = invoices.reduce((sum, inv) => sum + inv.daysOverdue, 0);
  return +(total / invoices.length).toFixed(1);
}

function amountOver30Days(invoices: OverdueInvoice[]): number {
  return invoices
    .filter((inv) => inv.daysOverdue > 30)
    .reduce((sum, inv) => sum + inv.outstanding, 0);
}

export default function DunningPage() {
  const { currentOrgCurrency } = useOrg();
  const [data, setData] = useState<DunningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/dunning");
      const result = await response.json();
      if (response.ok) {
        setData(result);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSendReminder = async (invoiceId: string, severity: SeverityBucket) => {
    setSendingId(invoiceId);
    try {
      const response = await fetch("/api/dunning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, reminderType: severity }),
      });
      const result = await response.json();
      if (response.ok) {
        setToast({ message: result.message ?? "Reminder sent", type: "success" });
        fetchData();
      } else {
        setToast({ message: result.error ?? "Failed to send reminder", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setSendingId(null);
    }
  };

  const filtered = data ? filterByTab(data.invoices, activeTab) : [];
  const summary = data?.summary;

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 animate-slide-up rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Dunning Management</h1>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="kpi-card kpi-accent-cyan">
            <p className="section-label">Total Overdue Amount</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {formatAmount(summary.totalOverdue, currentOrgCurrency)}
            </p>
          </div>
          <div className="kpi-card kpi-accent-purple">
            <p className="section-label">Overdue Invoices</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {data?.invoices.length ?? 0}
            </p>
          </div>
          <div className="kpi-card kpi-accent-amber">
            <p className="section-label">Avg Days Overdue</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {data ? avgDaysOverdue(data.invoices) : 0} days
            </p>
          </div>
          <div className="kpi-card kpi-accent-green">
            <p className="section-label">Amount &gt; 30 Days</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {data ? formatAmount(amountOver30Days(data.invoices), currentOrgCurrency) : formatAmount(0, currentOrgCurrency)}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? (data?.invoices.length ?? 0)
              : tab.key === "1-7"
              ? (data?.summary.countBySeverity.gentle ?? 0)
              : tab.key === "8-30"
              ? (data?.summary.countBySeverity.firm ?? 0)
              : tab.key === "31-60"
              ? (data?.summary.countBySeverity.urgent ?? 0)
              : (data?.summary.countBySeverity.final ?? 0);

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                activeTab === tab.key
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/10 px-1 text-[10px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="section-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading dunning data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {activeTab === "all"
              ? "No overdue invoices found."
              : "No invoices in this severity range."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Invoice #</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium text-right">Outstanding</th>
                  <th className="p-3 font-medium">Due Date</th>
                  <th className="p-3 font-medium text-center">Days Overdue</th>
                  <th className="p-3 font-medium">Severity</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-t border-white/5 hover:bg-white/5"
                  >
                    <td className="p-3 font-mono text-xs text-white">
                      #{inv.invoiceNumber}
                    </td>
                    <td className="p-3 text-xs text-slate-300">
                      {inv.customerName}
                    </td>
                    <td className="p-3 text-right text-white font-medium">
                      {formatAmount(inv.outstanding, currentOrgCurrency)}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          inv.daysOverdue <= 7
                            ? "bg-cyan-500/10 text-cyan-300"
                            : inv.daysOverdue <= 30
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {inv.daysOverdue}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`badge ${severityBadgeClass(inv.severity)}`}
                      >
                        {severityLabel(inv.severity)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSendReminder(inv.id, inv.severity)}
                        disabled={sendingId === inv.id}
                        className={inv.severity === "final" ? "btn-danger text-[11px] px-3 py-1" : "btn-primary text-[11px] px-3 py-1"}
                      >
                        {sendingId === inv.id ? "Sending..." : "Send Reminder"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type ApprovalItem = {
  id: string;
  docType: "invoice" | "order";
  invoiceNumber?: string;
  orderNumber?: string;
  customerName?: string;
  partyName?: string;
  total: number;
  createdAt: string;
  approvalStatus: string;
};

type ApprovalStats = {
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
};

const statusColors: Record<string, string> = {
  pending_approval: "bg-amber-500/10 text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-300",
  rejected: "bg-red-500/10 text-red-300",
  draft: "bg-slate-500/10 text-slate-300",
};

export default function ApprovalsPage() {
  const { currentOrgCurrency } = useOrg();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({ pendingCount: 0, approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setStats(data.stats || { pendingCount: 0, approvedToday: 0, rejectedToday: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleAction = async (id: string, docType: string, action: "approve" | "reject") => {
    setProcessingId(id);
    const reason = reasonInputs[id] || undefined;

    try {
      if (docType === "invoice") {
        await fetch(`/api/invoices/${id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        });
      } else {
        // For orders, use the same approve endpoint pattern via a generic API
        await fetch(`/api/approvals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docType: "order", docId: id, action, reason }),
        });
      }
      // Remove the item from the local list optimistically
      setItems((prev) => prev.filter((item) => item.id !== id));
      setStats((prev) => ({
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - 1),
        approvedToday: action === "approve" ? prev.approvedToday + 1 : prev.approvedToday,
        rejectedToday: action === "reject" ? prev.rejectedToday + 1 : prev.rejectedToday,
      }));
    } catch {
      // silent
    } finally {
      setProcessingId(null);
    }
  };

  const getDocNumber = (item: ApprovalItem) => item.invoiceNumber || item.orderNumber || "-";
  const getDocLabel = (item: ApprovalItem) => (item.docType === "invoice" ? "Invoice" : "Order");
  const getPartyName = (item: ApprovalItem) => item.customerName || item.partyName || "-";

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Workflow</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Approvals</h1>
        </div>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Pending Approval</p>
          <p className="mt-1 text-3xl font-bold text-amber-300">{stats.pendingCount}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Approved Today</p>
          <p className="mt-1 text-3xl font-bold text-emerald-300">{stats.approvedToday}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Rejected Today</p>
          <p className="mt-1 text-3xl font-bold text-red-300">{stats.rejectedToday}</p>
        </div>
      </div>

      {/* Pending items list */}
      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No items pending approval.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Number</th>
                  <th className="p-3 font-medium">Customer/Vendor</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        {getDocLabel(item)}
                      </span>
                    </td>
                    <td className="p-3 text-white font-medium">{getDocNumber(item)}</td>
                    <td className="p-3 text-slate-300">{getPartyName(item)}</td>
                    <td className="p-3 text-right text-white font-medium">
                      {formatAmount(item.total, currentOrgCurrency)}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-end gap-2">
                        <input
                          type="text"
                          placeholder="Rejection reason (optional)"
                          value={reasonInputs[item.id] || ""}
                          onChange={(e) =>
                            setReasonInputs((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-48 rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={processingId === item.id}
                            onClick={() => handleAction(item.id, item.docType, "approve")}
                            className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={processingId === item.id}
                            onClick={() => handleAction(item.id, item.docType, "reject")}
                            className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-semibold text-white hover:bg-red-400 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

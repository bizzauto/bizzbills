"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type PI = { id: string; proformaNumber: string; customerName: string; total: number; status: string; createdAt: string };

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-default", sent: "badge-warning", accepted: "badge-success",
  rejected: "badge-danger", expired: "badge-danger",
};

export default function ProformaInvoiceListPage() {
  const { currentOrgCurrency } = useOrg();
  const [invoices, setInvoices] = useState<PI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proforma-invoices")
      .then((r) => r.json())
      .then((d) => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Billing</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Proforma Invoices</h1>
          </div>
          <Link href="/proforma-invoices/new" className="btn-primary">+ New Proforma</Link>
        </div>
      </section>

      <div className="section-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-sm text-muted">No proforma invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium text-right">Total</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-default hover-brighten">
                    <td className="p-3 text-default font-mono">
                      <Link href={`/proforma-invoices/${inv.id}`} className="hover:text-accent-light">{inv.proformaNumber}</Link>
                    </td>
                    <td className="p-3 text-muted">{inv.customerName}</td>
                    <td className="p-3 text-xs text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right text-default font-medium">{formatAmount(inv.total, currentOrgCurrency)}</td>
                    <td className="p-3">
                      <span className={STATUS_BADGE[inv.status] || "badge-default"}>{inv.status}</span>
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

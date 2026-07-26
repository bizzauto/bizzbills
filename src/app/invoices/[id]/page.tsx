"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DiffViewer } from "@/components/invoice/DiffViewer";
import { VersionTimeline } from "@/components/invoice/VersionTimeline";
import { formatAmount } from "@/lib/currency";
import type { DiffChange } from "@/lib/diff";

type LineItem = {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type InvoiceData = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  currency: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  version: number;
  createdAt: string;
  lines: LineItem[];
};

type VersionEntry = {
  id: string;
  version: number;
  changeComment: string;
  createdAt: string;
  snapshot?: unknown;
  diff?: DiffChange[];
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status !== "authenticated" || !params.id) return;

    const abort = new AbortController();

    Promise.all([
      fetch(`/api/invoices/${invoiceId}`, { signal: abort.signal }).then((r) => r.json()),
      fetch(`/api/invoices/${invoiceId}/versions`, { signal: abort.signal }).then((r) => r.json()),
    ])
      .then(([inv, vers]) => {
        if (abort.signal.aborted) return;
        setInvoice(inv);
        const sorted = Array.isArray(vers) ? vers.sort((a: VersionEntry, b: VersionEntry) => b.version - a.version) : [];
        setVersions(sorted);
        setLoading(false);
        if (sorted.length > 0) {
          fetchVersionDetail(invoiceId, sorted[0].id);
        }
      })
      .catch(() => setLoading(false));

    return () => abort.abort();
  }, [status, params.id, router]);

  async function fetchVersionDetail(invoiceId: string, versionId: string) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/versions/${versionId}`);
      const data = await res.json();
      setSelectedVersion(data);
    } catch {
      // silently fail
    }
  }

  async function handleExport(format: string) {
    setExporting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/export?format=${format}`);
      if (!res.ok) return;

      const disposition = res.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="?(.+?)"?$/)?.[1] || `invoice.${format}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-6 pb-10">
        <div className="h-32 animate-pulse rounded-[2rem] bg-slate-800/50" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-64 animate-pulse rounded-[1.5rem] bg-slate-800/50" />
          <div className="h-64 animate-pulse rounded-[1.5rem] bg-slate-800/50" />
        </div>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="flex flex-1 items-center justify-center pb-10">
        <div className="text-center">
          <p className="text-4xl">🔍</p>
          <h1 className="mt-4 text-2xl font-semibold text-white">Invoice not found</h1>
          <Link href="/dashboard" className="mt-4 inline-block text-cyan-300 hover:text-cyan-200">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
              Invoice detail
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              #{invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              v{invoice.version} · {invoice.status} · {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExport("json")}
              disabled={exporting}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport("markdown")}
              disabled={exporting}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Markdown
            </button>
            <Link
              href="/billing"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Edit
            </Link>
          </div>
        </div>
      </section>

      {/* Main content grid */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Invoice details */}
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4 backdrop-blur sm:p-6">
          <h2 className="text-xl font-semibold text-white">Invoice details</h2>

          <div className="mt-4 grid gap-4 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Customer</p>
              <p className="font-medium text-white">{invoice.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">GSTIN</p>
              <p className="font-mono text-sm text-white">{invoice.customerGstin || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Invoice #</p>
              <p className="font-medium text-white">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Due date</p>
              <p className="font-medium text-white">{invoice.dueDate}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-[640px] text-sm sm:min-w-full">
<thead className="bg-slate-800/80 text-left text-slate-300">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">HSN</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">GST</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => {
                    const lineTotal = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
                    return (
                      <tr key={line.id} className="border-t border-white/10 bg-slate-900/50">
                        <td className="p-3 text-white">{line.description}</td>
                        <td className="p-3 text-slate-300 font-mono text-xs">{line.hsnCode || "—"}</td>
                        <td className="p-3 text-slate-300">{line.quantity}</td>
                        <td className="p-3 text-slate-300">{formatAmount(line.unitPrice, invoice.currency)}</td>
                        <td className="p-3 text-slate-300">{line.taxRate}%</td>
                        <td className="p-3 font-medium text-white">{formatAmount(lineTotal, invoice.currency)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1 rounded-xl bg-slate-900/80 p-3 text-right text-sm">
            <div className="text-slate-300">
              Subtotal: <span className="font-semibold text-white">{formatAmount(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="text-slate-300">
              Tax: <span className="font-semibold text-white">{formatAmount(invoice.taxTotal, invoice.currency)}</span>
            </div>
            <div className="border-t border-white/10 pt-1 text-white">
              Total: <span className="font-semibold">{formatAmount(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Version history + diff */}
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Versions</h2>
            <div className="mt-4">
              <VersionTimeline
                versions={versions}
                currentVersion={invoice.version}
                onSelectVersion={(versionId) => fetchVersionDetail(invoiceId, versionId)}
              />
            </div>
          </div>

          {selectedVersion?.diff && selectedVersion.diff.length > 0 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">
                Changes in v{selectedVersion.version}
              </h2>
              <div className="mt-4">
                <DiffViewer changes={selectedVersion.diff} />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

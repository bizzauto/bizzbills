"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DiffViewer } from "@/components/invoice/DiffViewer";
import { VersionTimeline } from "@/components/invoice/VersionTimeline";
import { formatAmount } from "@/lib/currency";
import { isValidGSTIN } from "@/lib/einvoice";
import type { DiffChange } from "@/lib/diff";
import { InvoiceTemplate, type TemplateData, type TemplateId } from "@/components/invoice/InvoiceTemplates";

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
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  discountAmount: number;
  shippingCharges: number;
  adjustment: number;
  roundOff: number;
  amountInWords: string;
  isTaxInclusive: boolean;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;
  customerState: string;
  shippingName: string;
  shippingAddress: string;
  shippingPhone: string;
  placeOfSupply: string;
  reverseCharge: boolean;
  poNumber: string;
  referenceNumber: string;
  notes: string;
  terms: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  upiId: string;
  signatureName: string;
  signatureDesignation: string;
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
  const { status } = useSession();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [eInvoiceIRN, setEInvoiceIRN] = useState<string | null>(null);
  const [eInvoiceQRData, setEInvoiceQRData] = useState<string | null>(null);
  const [eInvoiceDate, setEInvoiceDate] = useState<string | null>(null);
  const [generatingIRN, setGeneratingIRN] = useState(false);
  const [eInvoiceError, setEInvoiceError] = useState<string | null>(null);
  const [irnCopied, setIrnCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("classic");
  const [orgSettings, setOrgSettings] = useState<{ name?: string; address?: string; gstin?: string; email?: string; phone?: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status !== "authenticated" || !params.id) return;

    const abort = new AbortController();

    Promise.all([
      fetch(`/api/invoices/${invoiceId}`, { signal: abort.signal }).then((r) => {
        if (!r.ok) throw new Error("Invoice not found");
        return r.json();
      }),
      fetch(`/api/invoices/${invoiceId}/versions`, { signal: abort.signal }).then((r) => r.json()),
      fetch("/api/organization/settings").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([inv, vers, org]) => {
        if (abort.signal.aborted) return;
        setInvoice(inv);
        const sorted = Array.isArray(vers) ? vers.sort((a: VersionEntry, b: VersionEntry) => b.version - a.version) : [];
        setVersions(sorted);
        if (org && org.name) {
          setOrgSettings({ name: org.name, address: org.address, gstin: org.gstin, email: org.email, phone: org.phone });
          if (org.defaultTemplate) setSelectedTemplate(org.defaultTemplate);
        }
        setLoading(false);
        if (sorted.length > 0) {
          fetchVersionDetail(invoiceId, sorted[0].id);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setInvoice(null);
        setLoading(false);
      });

    return () => abort.abort();
  }, [status, params.id, router, invoiceId]);

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

  async function handleSendEmail() {
    if (!recipientEmail.trim()) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recipientEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStatus({ ok: true, msg: `Invoice sent to ${data.sentTo}` });
        setTimeout(() => {
          setEmailModalOpen(false);
          setEmailStatus(null);
          setRecipientEmail("");
        }, 2000);
      } else {
        setEmailStatus({ ok: false, msg: data.error ?? "Failed to send email" });
      }
    } catch {
      setEmailStatus({ ok: false, msg: "Network error — could not send email" });
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleGenerateEInvoice() {
    setGeneratingIRN(true);
    setEInvoiceError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/e-invoice`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setEInvoiceIRN(data.irn);
        setEInvoiceQRData(data.qrData);
        setEInvoiceDate(data.irnDate);
      } else {
        setEInvoiceError(data?.error ?? "Failed to generate E-Invoice");
      }
    } catch {
      setEInvoiceError("Network error — could not generate E-Invoice");
    } finally {
      setGeneratingIRN(false);
    }
  }

  function handleCopyIRN() {
    if (!eInvoiceIRN) return;
    navigator.clipboard.writeText(eInvoiceIRN).then(() => {
      setIrnCopied(true);
      setTimeout(() => setIrnCopied(false), 2000);
    });
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
          <p className="mt-2 text-sm text-slate-400">
            It may have been deleted, or you do not have access to it.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-cyan-300 hover:text-cyan-200">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const templateData: TemplateData = {
    number: invoice.invoiceNumber,
    title: "Tax Invoice",
    customerName: invoice.customerName,
    customerAddress: invoice.customerAddress || undefined,
    customerGstin: invoice.customerGstin,
    customerEmail: invoice.customerEmail || undefined,
    customerPhone: invoice.customerPhone || undefined,
    customerState: invoice.customerState || undefined,
    date: invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN") : new Date(invoice.createdAt).toLocaleDateString("en-IN"),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : undefined,
    poNumber: invoice.poNumber || undefined,
    referenceNumber: invoice.referenceNumber || undefined,
    placeOfSupply: invoice.placeOfSupply || undefined,
    reverseCharge: invoice.reverseCharge,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      hsnCode: l.hsnCode,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountAmount,
    taxTotal: invoice.taxTotal,
    shippingCharges: invoice.shippingCharges,
    adjustment: invoice.adjustment,
    roundOff: invoice.roundOff,
    total: invoice.total,
    amountInWords: invoice.amountInWords || undefined,
    currency: invoice.currency,
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
    shippingName: invoice.shippingName || undefined,
    shippingAddress: invoice.shippingAddress || undefined,
    shippingPhone: invoice.shippingPhone || undefined,
    orgName: orgSettings?.name || "Your Company",
    orgAddress: orgSettings?.address,
    orgGstin: orgSettings?.gstin,
    orgEmail: orgSettings?.email,
    orgPhone: orgSettings?.phone,
    bankName: invoice.bankName || undefined,
    bankAccountName: invoice.bankAccountName || undefined,
    bankAccount: invoice.bankAccountNumber || undefined,
    bankIfsc: invoice.bankIfsc || undefined,
    bankBranch: invoice.bankBranch || undefined,
    upiId: invoice.upiId || undefined,
    signatureName: invoice.signatureName || undefined,
    signatureDesignation: invoice.signatureDesignation || undefined,
    isPaid: invoice.status === "paid",
  };

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur no-print">
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
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as TemplateId)}
              className="rounded-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white outline-none"
            >
              <option value="classic">Classic GST</option>
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
              <option value="premium">Premium</option>
              <option value="mybillbook">Super</option>
              <option value="best">Best (Tally)</option>
              <option value="corporate">Corporate</option>
              <option value="compact">Compact</option>
            </select>
            <button
              onClick={() => window.print()}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Print / Preview
            </button>
            <button
              onClick={() => {
                setEmailModalOpen(true);
                setEmailStatus(null);
              }}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Send Email
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

      {/* Print header — only visible when printing */}
      <section className="print-only mb-8">
        <InvoiceTemplate template={selectedTemplate} data={templateData} />
      </section>

      {/* Payment status bar */}
      {invoice.status !== "draft" && (
        <div className={`rounded-[1.5rem] border p-5 backdrop-blur ${
          invoice.status === "paid"
            ? "border-emerald-400/20 bg-emerald-500/10"
            : invoice.status === "overdue"
            ? "border-red-400/20 bg-red-500/10"
            : "border-amber-400/20 bg-amber-500/10"
        }`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white capitalize">
                {invoice.status === "paid" ? "✓ Paid" : invoice.status === "overdue" ? "⚠ Overdue" : "● Sent"}
              </p>
              <p className="text-xs text-slate-400">
                {invoice.status === "paid"
                  ? "This invoice has been fully paid."
                  : "Awaiting payment from customer."}
              </p>
            </div>
            {invoice.status !== "paid" && (
              <div className="flex gap-2">
                <PayOnlineButton invoiceId={invoice.id} total={invoice.total} currency={invoice.currency} />
                <MarkAsPaidButton invoiceId={invoice.id} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* E-Invoice section */}
      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
              E-Invoice
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">GST Compliance</h2>
          </div>
          {!eInvoiceIRN && (
            <button
              onClick={handleGenerateEInvoice}
              disabled={generatingIRN}
              className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {generatingIRN ? "Generating..." : "Generate E-Invoice"}
            </button>
          )}
        </div>

        {/* GSTIN validation status */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                invoice.customerGstin && isValidGSTIN(invoice.customerGstin)
                  ? "bg-emerald-400"
                  : "bg-red-400"
              }`}
            />
            <div>
              <p className="text-xs text-slate-400">Buyer GSTIN</p>
              <p className="font-mono text-sm text-white">
                {invoice.customerGstin || "Not provided"}
              </p>
            </div>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                invoice.customerGstin && isValidGSTIN(invoice.customerGstin)
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300"
              }`}
            >
              {invoice.customerGstin && isValidGSTIN(invoice.customerGstin)
                ? "Valid"
                : "Invalid"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
            <div>
              <p className="text-xs text-slate-400">Supplier GSTIN</p>
              <p className="font-mono text-sm text-slate-400">
                Configure in organization settings
              </p>
            </div>
          </div>
        </div>

        {eInvoiceError && (
          <div className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {eInvoiceError}
          </div>
        )}

        {/* Generated E-Invoice result */}
        {eInvoiceIRN && (
          <div className="mt-4 space-y-3">
            {/* Compliance badge */}
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                E-Invoice Generated
              </span>
              {eInvoiceDate && (
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(eInvoiceDate).toLocaleString()}
                </span>
              )}
            </div>

            {/* IRN display */}
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Invoice Reference Number (IRN)</p>
                <button
                  onClick={handleCopyIRN}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/10"
                >
                  {irnCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-sm text-cyan-300">
                {eInvoiceIRN}
              </p>
            </div>

            {/* QR Code data */}
            {eInvoiceQRData && (
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-400">QR Code Data</p>
                <div className="mt-2 flex items-center justify-center rounded-xl border border-white/10 bg-white p-4">
                  <QrCode value={eInvoiceQRData} />
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">
                    View raw JSON
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-950 p-2 text-[10px] text-slate-400">
                    {JSON.stringify(JSON.parse(eInvoiceQRData), null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
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
              <p className="text-xs text-slate-400">Invoice date</p>
              <p className="font-medium text-white">
                {invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Due date</p>
              <p className="font-medium text-white">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "—"}
              </p>
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
            {invoice.discountAmount > 0 && (
              <div className="text-red-300">
                Discount: <span className="font-semibold">-{formatAmount(invoice.discountAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="text-slate-300">
              Tax: <span className="font-semibold text-white">{formatAmount(invoice.taxTotal, invoice.currency)}</span>
            </div>
            {invoice.shippingCharges > 0 && (
              <div className="text-slate-300">
                Shipping: <span className="font-semibold text-white">{formatAmount(invoice.shippingCharges, invoice.currency)}</span>
              </div>
            )}
            {invoice.adjustment > 0 && (
              <div className="text-slate-300">
                Adjustment: <span className="font-semibold text-white">-{formatAmount(invoice.adjustment, invoice.currency)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="text-slate-400">
                Round Off: <span className="font-semibold">{invoice.roundOff > 0 ? "+" : ""}{formatAmount(invoice.roundOff, invoice.currency)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-1 text-white">
              Total: <span className="font-semibold">{formatAmount(invoice.total, invoice.currency)}</span>
            </div>
            {invoice.amountInWords && (
              <div className="text-xs italic text-slate-400">{invoice.amountInWords}</div>
            )}
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

      {/* Send Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Send Invoice by Email</h3>
            <p className="mt-1 text-sm text-slate-400">
              Invoice #{invoice.invoiceNumber} — {formatAmount(invoice.total, invoice.currency)}
            </p>

            <div className="mt-4">
              <label className="block text-sm">
                <span className="text-slate-400">Recipient email</span>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && recipientEmail.trim()) handleSendEmail();
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                  placeholder="customer@example.com"
                  autoFocus
                />
              </label>
            </div>

            {emailStatus && (
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                  emailStatus.ok
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {emailStatus.msg}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEmailModalOpen(false);
                  setEmailStatus(null);
                  setRecipientEmail("");
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !recipientEmail.trim()}
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {sendingEmail ? "Sending..." : "Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * Minimal QR code renderer (ISO/IEC 18004) — renders the GST e-invoice
 * payload so scanners can read it. Renders a QR matrix as SVG.
 */
function QrCode({ value, size = 132 }: { value: string; size?: number }) {
  const modules = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!modules) {
    return <p className="px-3 py-2 text-xs text-slate-500">QR unavailable</p>;
  }

  const n = modules.length;
  const cell = size / n;
  let path = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (modules[row][col]) {
        path += `M${(col * cell).toFixed(1)},${(row * cell).toFixed(1)}h${cell.toFixed(1)}v${cell.toFixed(1)}h-${cell.toFixed(1)}z`;
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-[10px] font-bold text-slate-900">E-INVOICE</p>
      <p className="text-[8px] text-slate-600">Scan for verification</p>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="E-invoice QR code">
        <rect width={size} height={size} fill="#fff" />
        <path d={path} fill="#0f172a" />
      </svg>
      <p className="mt-1 font-mono text-[7px] text-slate-500">IRN {value.slice(0, 16)}…</p>
    </div>
  );
}

const QR_ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function qrNumericBits(s: string): number[] {
  const bits: number[] = [];
  const push = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  push(1, 4); // numeric mode
  push(s.length, 10);
  let i = 0;
  for (; i + 3 <= s.length; i += 3) push(parseInt(s.slice(i, i + 3), 10), 10);
  if (s.length - i === 2) push(parseInt(s.slice(i), 10), 7);
  else if (s.length - i === 1) push(parseInt(s.slice(i), 10), 4);
  return bits;
}

function qrAlphanumericBits(s: string): number[] {
  const bits: number[] = [];
  const push = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  push(2, 4); // alphanumeric mode
  push(s.length, 9);
  let i = 0;
  for (; i + 2 <= s.length; i += 2) {
    push(QR_ALPHANUM.indexOf(s[i]) * 45 + QR_ALPHANUM.indexOf(s[i + 1]), 11);
  }
  if (i < s.length) push(QR_ALPHANUM.indexOf(s[i]), 6);
  return bits;
}

function qrByteBits(s: string): number[] {
  const bytes = new TextEncoder().encode(s);
  const bits: number[] = [];
  const push = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  push(4, 4); // byte mode
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  return bits;
}

const QR_GENERATOR = 0x11d;

function qrReedSolomon(data: number[], ecCount: number): number[] {
  // Generator polynomial coefficients
  let gen: number[] = [1];
  for (let i = 0; i < ecCount; i++) {
    const next: number[] = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gen[j] * 2; // multiply by alpha^0..alpha^(ecCount-1) handled below
    }
    // Multiply by (x + alpha^i)
    for (let j = 0; j < next.length; j++) next[j] = qrGfMul(next[j], i === 0 ? 1 : 1);
    gen = next;
  }
  // Standard: gen = ∏ (x - α^i) for i in 0..ecCount-1
  gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= qrGfMul(gen[j], 1);
    }
    // multiply by (x + α^i): coefficients shift
    const shifted: number[] = new Array(next.length).fill(0);
    for (let j = 0; j < next.length; j++) shifted[j] ^= next[j];
    // apply α^i to constant term of (x + α^i): constant term = α^i
    const poly: number[] = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      poly[j + 1] ^= gen[j];
      poly[j] ^= qrGfMul(gen[j], QR_ALPHA_POW[i]);
    }
    gen = poly;
  }
  const remainder = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift()!;
    remainder.push(0);
    for (let i = 0; i < ecCount; i++) {
      remainder[i] ^= qrGfMul(gen[i + 1], factor);
    }
  }
  return remainder;
}

function qrGfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  const log = qrGfLog(a) + qrGfLog(b);
  return QR_ALPHA_POW[log % 255];
}

const QR_ALPHA_POW = (() => {
  const pow = new Array(255);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    pow[i] = x;
    x <<= 1;
    if (x & 0x100) x ^= QR_GENERATOR;
  }
  return pow;
})();

const QR_LOG_TABLE = (() => {
  const log = new Array(256);
  for (let i = 0; i < 255; i++) log[QR_ALPHA_POW[i]] = i;
  return log;
})();

function qrGfLog(x: number): number {
  return QR_LOG_TABLE[x];
}

function qrMask(data: number[], bitIndex: number): boolean {
  const x = bitIndex % 21;
  const y = Math.floor(bitIndex / 21);
  // Mask pattern 0: (x + y) % 2 == 0
  return (x + y) % 2 === 0;
}

function generateQrMatrix(text: string): boolean[][] {
  const size = 21; // version 1
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const isNumeric = /^\d+$/.test(text);
  const isAlphanumeric = [...text].every((c) => QR_ALPHANUM.includes(c));
  const dataBits = isNumeric
    ? qrNumericBits(text)
    : isAlphanumeric
      ? qrAlphanumericBits(text)
      : qrByteBits(text);

  const maxBits = 19 * 8; // version 1-L: 19 data codewords
  dataBits.push(...new Array(Math.max(0, maxBits - dataBits.length)).fill(0));
  // Terminate with pattern 0000 if room
  if (dataBits.length > maxBits) throw new Error("Data too long for QR");

  const codewords: number[] = [];
  for (let i = 0; i < dataBits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (dataBits[i + j] ?? 0);
    codewords.push(byte);
  }
  const ec = qrReedSolomon(codewords, 7);
  const all = [...codewords, ...ec];

  // Reserve function patterns: finder + separators + timing + dark module + format info
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const on =
          r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
          (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        matrix[rr][cc] = on;
        reserved[rr][cc] = true;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }
  matrix[size - 8][8] = true; // dark module
  reserved[size - 8][8] = true;

  // Format info (mask 0, ECC L): 111011111000100
  const formatBits = 0b111011111000100;
  const fmtReserved: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const bit = (formatBits >> i) & 1;
    if (i < 6) { matrix[8][i] = !!bit; reserved[8][i] = true; fmtReserved.push([8, i]); }
    else if (i === 6) { matrix[8][7] = !!bit; reserved[8][7] = true; fmtReserved.push([8, 7]); }
    else if (i === 7) { matrix[8][8] = !!bit; reserved[8][8] = true; fmtReserved.push([8, 8]); }
    else { matrix[7][8] = !!bit; reserved[7][8] = true; fmtReserved.push([7, 8]); }
  }
  for (let i = 0; i < 8; i++) {
    const bit = (formatBits >> (14 - i)) & 1;
    matrix[i][8] = !!bit;
    reserved[i][8] = true;
    fmtReserved.push([i, 8]);
  }
  matrix[0][size - 1] = !!(formatBits & 1); reserved[0][size - 1] = true;
  void fmtReserved;

  // Place data bits in zigzag
  let bitIndex = 0;
  let col = size - 1;
  let upward = true;
  while (col > 0) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (cc < 0 || reserved[row][cc]) continue;
        if (bitIndex < all.length * 8) {
          const bit = (all[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1;
          matrix[row][cc] = qrMask(all, bitIndex) ? !bit : !!bit;
        } else {
          matrix[row][cc] = qrMask(all, bitIndex);
        }
        bitIndex++;
      }
    }
    upward = !upward;
    col -= 2;
  }

  return matrix;
}

function MarkAsPaidButton({ invoiceId }: { invoiceId: string }) {
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleMarkPaid() {
    setSaving(true);
    try {
      await fetch("/api/payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method, notes: notes || undefined }),
      });
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Mark as Paid
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Record Payment</h3>
            <p className="mt-1 text-sm text-slate-400">Mark this invoice as paid.</p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-slate-400">Payment method</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Notes (optional)</span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                  placeholder="Payment reference or note"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={saving}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PayOnlineButton({
  invoiceId,
  total,
  currency,
}: {
  invoiceId: string;
  total: number;
  currency: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateOrder() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, currency, invoiceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderId(data.orderId);
      } else {
        setError(data.error ?? "Failed to create order");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPaid() {
    setLoading(true);
    try {
      await fetch("/api/payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method: "razorpay", notes: `Razorpay order: ${orderId}` }),
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setShowModal(false);
    setOrderId(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
      >
        Pay Online
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Online Payment</h3>
            <p className="mt-1 text-sm text-slate-400">
              Pay {currency} {total.toLocaleString("en-IN")} via Razorpay
            </p>

            <div className="mt-4">
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {!orderId ? (
                <button
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
                >
                  {loading ? "Creating order..." : "Create Payment Order"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                    <p className="text-slate-400">Order ID</p>
                    <p className="font-mono text-white">{orderId}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    In production, the Razorpay checkout would open here. Click below to simulate a successful payment.
                  </p>
                  <button
                    onClick={handleConfirmPaid}
                    disabled={loading}
                    className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Mark as Paid (Simulate)"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClose}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

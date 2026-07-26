"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { formatAmount } from "@/lib/currency";
import {
  calculateInvoiceSummary,
  sanitizeInvoiceDraft,
  type InvoiceDraft,
  type InvoiceLine,
} from "@/lib/invoicing";
import { suggestHsn } from "@/lib/ai/gst";
import { detectAnomalies } from "@/lib/ai/anomaly";
import type { AiSuggestion, AnomalyFlag, HsnSuggestion } from "@/lib/ai/types";
import Link from "next/link";

const emptyDraft: InvoiceDraft = {
  customerName: "",
  customerGstin: "",
  currency: "INR",
  invoiceNumber: "",
  dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  lines: [
    { id: "1", description: "", quantity: 1, unitPrice: 0, taxRate: 18, hsnCode: "" },
  ],
};

type QuickAction = {
  label: string;
  key: string;
  loading?: boolean;
};

export default function BillingPage() {
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { label: "Generate invoice from voice", key: "voice" },
    { label: "Scan OCR document", key: "ocr" },
    { label: "Suggest GST HSN", key: "hsn" },
    { label: "Auto-send reminder", key: "reminder" },
  ]);

  const sanitizedDraft = useMemo(() => sanitizeInvoiceDraft(draft), [draft]);
  const summary = useMemo(() => calculateInvoiceSummary(sanitizedDraft), [sanitizedDraft]);

  // Live AI analysis — computed on every keystroke from local rules
  const aiSuggestions = useMemo<AiSuggestion[]>(() => {
    const result: AiSuggestion[] = [];

    // HSN suggestions from line descriptions
    for (const line of sanitizedDraft.lines) {
      if (line.description.length >= 3) {
        const hsns = suggestHsn(line.description);
        for (const h of hsns) {
          result.push({
            type: "hsn",
            title: `HSN ${h.hsnCode} — ${h.taxRate}% GST`,
            description: `Suggested for "${line.description}"`,
            confidence: h.confidence,
            action: `${h.description}`,
          });
        }
      }
    }

    return result.slice(0, 4);
  }, [sanitizedDraft]);

  const anomalies = useMemo<AnomalyFlag[]>(() => {
    if (sanitizedDraft.lines.some((l) => l.description.length > 0)) {
      return detectAnomalies(sanitizedDraft);
    }
    return [];
  }, [sanitizedDraft]);

  const draftLines = draft.lines; // stable ref for UI

  function updateField<K extends keyof InvoiceDraft>(
    key: K,
    value: InvoiceDraft[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateLine(
    id: string,
    field: keyof InvoiceLine,
    value: string | number,
  ) {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]:
                field === "description" || field === "hsnCode"
                  ? (value as string)
                  : value === "" || value === undefined
                    ? 0
                    : Number(value) || 0,
            }
          : line,
      ),
    }));
    setSaved(false);
  }

  function addLine() {
    const newId = String(Date.now());
    setDraft((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { id: newId, description: "", quantity: 1, unitPrice: 0, taxRate: 18, hsnCode: "" },
      ],
    }));
  }

  function removeLine(id: string) {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== id),
    }));
  }

  function resetForm() {
    setDraft(emptyDraft);
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    if (!summary.isValid) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedDraft),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save invoice");
      }

      try {
        const invoice = await res.json();
        await fetch("/api/accounting/journal-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryNumber: `JE-${invoice.invoiceNumber}`,
            date: new Date().toISOString().split("T")[0],
            description: `Invoice ${invoice.invoiceNumber} for ${sanitizedDraft.customerName}`,
            reference: `INV-${invoice.invoiceNumber}`,
            lines: [
              {
                accountId: "revenue",
                debit: 0,
                credit: summary.total,
                description: `Invoice ${invoice.invoiceNumber} - Revenue`,
              },
              {
                accountId: "receivable",
                debit: summary.total,
                credit: 0,
                description: `Invoice ${invoice.invoiceNumber} - Receivable`,
              },
              ...sanitizedDraft.lines.flatMap((line) => {
                const taxAmount = (line.quantity * line.unitPrice * line.taxRate) / 100;
                if (line.taxRate > 0) {
                  return [
                    { accountId: "expense", debit: line.quantity * line.unitPrice, credit: 0, description: `Invoice ${invoice.invoiceNumber} - ${line.description}` },
                    { accountId: "tax-payable", debit: 0, credit: taxAmount, description: `GST ${line.taxRate}% on ${line.description}` },
                  ];
                }
                return [{ accountId: "expense", debit: line.quantity * line.unitPrice, credit: 0, description: `Invoice ${invoice.invoiceNumber} - ${line.description}` }];
              }),
            ],
          }),
        });
      } catch {
        // Ledger posting is non-critical — invoice is still saved
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAction(action: QuickAction) {
    setQuickActions((prev) =>
      prev.map((a) =>
        a.key === action.key ? { ...a, loading: true } : a,
      ),
    );

    // Simulate AI processing delay
    await new Promise((r) => setTimeout(r, 1200));

    setQuickActions((prev) =>
      prev.map((a) =>
        a.key === action.key ? { ...a, loading: false } : a,
      ),
    );

    if (action.key === "hsn" && aiSuggestions.length > 0) {
      const hsn = aiSuggestions[0];
      // Auto-apply first HSN suggestion tax rate to all lines
      if (hsn.type === "hsn") {
        const taxRate = parseInt(hsn.title.match(/(\d+)%/)?.[1] ?? "18", 10);
        setDraft((prev) => ({
          ...prev,
          lines: prev.lines.map((l) => ({ ...l, taxRate })),
        }));
      }
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
              Billing workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Create, validate, and send invoices at production speed.
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetForm}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              New invoice
            </button>
            <button
              onClick={handleSave}
              disabled={!summary.isValid || saving}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save invoice"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Invoice form */}
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4 backdrop-blur sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Invoice draft</p>
              <h2 className="text-xl font-semibold text-white">
                #{sanitizedDraft.invoiceNumber || "New"}
              </h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                summary.isValid
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {summary.isValid ? "Valid" : "Needs review"}
            </span>
          </div>

          <div className="mt-6 space-y-4 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Customer</span>
                <input
                  value={draft.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Invoice #</span>
                <input
                  value={draft.invoiceNumber}
                  onChange={(e) => updateField("invoiceNumber", e.target.value)}
                  placeholder="INV-0001"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">GSTIN</span>
                <input
                  value={draft.customerGstin}
                  onChange={(e) => updateField("customerGstin", e.target.value)}
                  placeholder="27AABCU9603R1ZX"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Due date</span>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => updateField("dueDate", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0"
                />
              </label>
            </div>

            <div className="-mx-4 overflow-x-auto rounded-xl border border-white/10 sm:mx-0">
              <table className="min-w-[640px] text-sm sm:min-w-full">
                <thead className="bg-slate-800/80 text-left text-slate-300">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">HSN</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">GST %</th>
                    <th className="p-3">Total</th>
                    <th className="w-10 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {sanitizedDraft.lines.map((line) => {
                    const lineTotal =
                      line.quantity *
                      line.unitPrice *
                      (1 + line.taxRate / 100);
                    const hsnHints = line.description
                      ? suggestHsn(line.description)
                      : [];
                    return (
                      <tr
                        key={line.id}
                        className="border-t border-white/10 bg-slate-900/50"
                      >
                        <td className="p-2">
                          <input
                            value={
                              draftLines.find((l) => l.id === line.id)
                                ?.description ?? ""
                            }
                            onChange={(e) =>
                              updateLine(line.id, "description", e.target.value)
                            }
                            placeholder="Item description"
                            className="w-full rounded-lg bg-slate-900 px-2 py-1 text-white outline-none ring-0 placeholder:text-slate-500"
                          />
                          {hsnHints.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {hsnHints.map((h) => (
                                <span
                                  key={h.hsnCode}
                                  className="inline-block rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200"
                                >
                                  HSN {h.hsnCode} · {h.taxRate}%
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            value={
                              draftLines.find((l) => l.id === line.id)
                                ?.hsnCode ?? ""
                            }
                            onChange={(e) =>
                              updateLine(line.id, "hsnCode", e.target.value)
                            }
                            placeholder="HSN code"
                            className="w-20 rounded-lg bg-slate-900 px-2 py-1 text-white outline-none ring-0 placeholder:text-slate-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            value={
                              draftLines.find((l) => l.id === line.id)
                                ?.quantity ?? ""
                            }
                            onChange={(e) =>
                              updateLine(line.id, "quantity", e.target.value)
                            }
                            className="w-16 rounded-lg bg-slate-900 px-2 py-1 text-center text-white outline-none ring-0"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            value={
                              draftLines.find((l) => l.id === line.id)
                                ?.unitPrice ?? ""
                            }
                            onChange={(e) =>
                              updateLine(line.id, "unitPrice", e.target.value)
                            }
                            className="w-24 rounded-lg bg-slate-900 px-2 py-1 text-right text-white outline-none ring-0"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={
                              draftLines.find((l) => l.id === line.id)
                                ?.taxRate ?? ""
                            }
                            onChange={(e) =>
                              updateLine(line.id, "taxRate", e.target.value)
                            }
                            className="w-16 rounded-lg bg-slate-900 px-2 py-1 text-center text-white outline-none ring-0"
                          />
                        </td>
                        <td className="p-3 font-medium text-white">
                          {formatAmount(lineTotal, draft.currency)}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                            disabled={draft.lines.length <= 1}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={addLine}
              className="text-sm text-cyan-300 hover:text-cyan-200"
            >
              + Add line item
            </button>

            <div className="space-y-2 rounded-xl bg-slate-900/80 p-3 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-white">
                  {formatAmount(summary.subtotal, draft.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Tax</span>
                <span className="font-semibold text-white">
                  {formatAmount(summary.taxTotal, draft.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-white">
                <span>Total</span>
                <span className="font-semibold">
                  {formatAmount(summary.total, draft.currency)}
                </span>
              </div>
            </div>

            {summary.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                {summary.warnings.join(" • ")}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {saved && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                Invoice saved successfully! View it in the{" "}
                <Link href="/dashboard" className="underline">
                  dashboard
                </Link>
                .
              </div>
            )}
          </div>
        </div>

        {/* AI assist side panel */}
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">AI assist</h2>

            {/* Quick action buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  disabled={action.loading}
                  onClick={() => handleQuickAction(action)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    action.loading
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-300"
                      : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                  }`}
                >
                  {action.loading ? "Processing…" : action.label}
                </button>
              ))}
            </div>

            {/* HSN suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  HSN suggestions
                </p>
                {aiSuggestions.slice(0, 3).map((s) => (
                  <div
                    key={s.title}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200"
                  >
                    <span className="font-medium text-white">{s.title}</span>
                    <p className="mt-0.5 text-slate-300">{s.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Anomaly flags */}
            {anomalies.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Flags ({anomalies.length})
                </p>
                {anomalies.map((flag) => (
                  <div
                    key={flag.field}
                    className={`rounded-xl border p-3 text-sm ${
                      flag.severity === "critical"
                        ? "border-red-400/20 bg-red-500/10 text-red-200"
                        : flag.severity === "warning"
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border-slate-400/20 bg-slate-500/10 text-slate-200"
                    }`}
                  >
                    <p className="font-medium text-white">{flag.message}</p>
                    <p className="mt-0.5 text-xs opacity-80">{flag.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {aiSuggestions.length === 0 && anomalies.length === 0 && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-400">
                Start typing line items and the AI assistant will suggest HSN
                codes, flag anomalies, and help draft your invoice.
              </div>
            )}
          </div>

          {/* Next actions */}
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Next actions</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <button className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-left transition hover:bg-slate-900/70">
                Send e-invoice draft
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-left transition hover:bg-slate-900/70">
                Schedule reminder for 2 days
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-left transition hover:bg-slate-900/70">
                Save as recurring billing template
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

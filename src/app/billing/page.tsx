"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  TemplateSelector,
  InvoiceTemplate,
  type TemplateId,
  type TemplateData,
} from "@/components/invoice/InvoiceTemplates";

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
  const router = useRouter();
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("classic");
  const [accentColor, setAccentColor] = useState<string>("#06b6d4");
  const [showPreview, setShowPreview] = useState(false);
  const [templateSettings, setTemplateSettings] = useState<{
    invoiceTitle?: string;
    footerNotes?: string;
    orgName?: string;
    orgAddress?: string;
    orgGstin?: string;
    plan?: string;
  } | null>(null);
  // Party search
  const [partySearch, setPartySearch] = useState("");
  const [partyResults, setPartyResults] = useState<{ id: string; name: string; gstin: string; email?: string; phone?: string }[]>([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  // Product search for line items
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<{ id: string; name: string; hsnCode: string; sellingPrice: number; taxRate: number; unit: string }[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [activeProductLine, setActiveProductLine] = useState<string | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { label: "Generate invoice from voice", key: "voice" },
    { label: "Scan OCR document", key: "ocr" },
    { label: "Suggest GST HSN", key: "hsn" },
    { label: "Auto-send reminder", key: "reminder" },
  ]);

  // Load saved template settings from org
  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.defaultTemplate) setSelectedTemplate(data.defaultTemplate);
        if (data.defaultAccentColor) setAccentColor(data.defaultAccentColor);
        setTemplateSettings({
          invoiceTitle: data.invoiceTitle,
          footerNotes: data.footerNotes,
          orgName: data.name,
          orgAddress: data.address,
          orgGstin: data.gstin,
          plan: data.plan,
        });
      })
      .catch(() => {});
  }, []);

  // Party search — fetch after 2+ characters
  useEffect(() => {
    if (partySearch.length < 2) {
      setPartyResults([]);
      setShowPartyDropdown(false);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/parties?search=${encodeURIComponent(partySearch)}`)
        .then((r) => r.json())
        .then((data) => {
          const parties = Array.isArray(data) ? data : data.parties || [];
          setPartyResults(parties.slice(0, 8));
          setShowPartyDropdown(parties.length > 0);
        })
        .catch(() => setPartyResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [partySearch]);

  // Product search for line items — fetch after 2+ characters
  useEffect(() => {
    if (productSearch.length < 2 || !activeProductLine) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(productSearch)}`)
        .then((r) => r.json())
        .then((data) => {
          const products = data.products || [];
          setProductResults(products.slice(0, 8));
          setShowProductDropdown(products.length > 0);
        })
        .catch(() => setProductResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [productSearch, activeProductLine]);

  function selectProduct(lineId: string, product: typeof productResults[0]) {
    updateLine(lineId, "description", product.name);
    updateLine(lineId, "hsnCode", product.hsnCode || "");
    updateLine(lineId, "unitPrice", product.sellingPrice || 0);
    updateLine(lineId, "taxRate", product.taxRate || 0);
    setProductSearch("");
    setProductResults([]);
    setShowProductDropdown(false);
    setActiveProductLine(null);
  }

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

  // Convert draft to TemplateData for live preview
  const templateData = useMemo<TemplateData>(() => ({
    number: sanitizedDraft.invoiceNumber || "INV-NEW",
    title: templateSettings?.invoiceTitle || "Tax Invoice",
    customerName: sanitizedDraft.customerName || "(Customer Name)",
    customerGstin: sanitizedDraft.customerGstin,
    date: new Date().toLocaleDateString("en-IN"),
    dueDate: sanitizedDraft.dueDate ? new Date(sanitizedDraft.dueDate).toLocaleDateString("en-IN") : undefined,
    lines: sanitizedDraft.lines.map((l) => ({
      description: l.description || "(Item)",
      hsnCode: l.hsnCode,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
    subtotal: summary.subtotal,
    taxTotal: summary.taxTotal,
    total: summary.total,
    currency: sanitizedDraft.currency,
    notes: summary.warnings.length > 0 ? summary.warnings.join("; ") : undefined,
    terms: templateSettings?.footerNotes || "Payment due within 7 days. Thank you for your business.",
    orgName: templateSettings?.orgName || "BizzBills",
    orgAddress: templateSettings?.orgAddress || "Your Business Address",
    orgGstin: templateSettings?.orgGstin || "27AABCU9603R1ZX",
    isPaid: false,
    accentColor,
    watermark: templateSettings?.plan === "free",
  }), [sanitizedDraft, summary, accentColor, templateSettings]);

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

      const invoice = await res.json();

      // Ledger posting is non-critical — fire and forget
      fetch("/api/accounting/journal-entries", {
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
      }).catch(() => {});

      // Redirect to invoice detail/preview page
      router.push(`/invoices/${invoice.id}`);
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
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">
              Billing workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Create, validate, and send invoices at production speed.
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetForm}
              className="btn-secondary text-sm font-semibold"
            >
              New invoice
            </button>
            <button
              onClick={handleSave}
              disabled={!summary.isValid || saving}
              className="btn-primary"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save invoice"}
            </button>
          </div>
        </div>
      </section>

      {/* Template Selector */}
      <section className="section-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label">Invoice Template</p>
            <h2 className="text-lg font-semibold text-default mt-0.5">Choose a layout for this invoice</h2>
          </div>
          <button
            onClick={() => setShowPreview((p) => !p)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              showPreview
                ? "border-default bg-accent-subtle text-accent-light"
                : "border-default text-muted hover-brighten"
            }`}
          >
            {showPreview ? "Hide Preview" : "Live Preview"}
          </button>
        </div>
        <TemplateSelector selected={selectedTemplate} accentColor={accentColor} onChange={setSelectedTemplate} onColorChange={setAccentColor} />
      </section>

      {showPreview && (
        <section className="section-card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">
              Preview — <span className="text-accent-light font-semibold">{selectedTemplate}</span>
            </p>
            <button
              onClick={() => window.print()}
              className="rounded-full border border-default px-3 py-1 text-xs text-muted hover-brighten transition"
            >
              🖨 Print Preview
            </button>
          </div>
          <div className="rounded-xl border border-default bg-white overflow-hidden max-h-[600px] overflow-y-auto">
            <InvoiceTemplate template={selectedTemplate} data={templateData} />
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Invoice form */}
        <div className="section-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Invoice draft</p>
              <h2 className="text-xl font-semibold text-default">
                #{sanitizedDraft.invoiceNumber || "New"}
              </h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                summary.isValid
                  ? "bg-success text-success"
                  : "bg-warning text-warning"
              }`}
            >
              {summary.isValid ? "Valid" : "Needs review"}
            </span>
          </div>

          <div className="mt-6 space-y-4 section-card p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="relative text-sm text-muted">
                <span className="mb-1 block text-muted">Customer</span>
                <input
                  value={partySearch || draft.customerName}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    updateField("customerName", e.target.value);
                    // Clear GSTIN when typing new name
                    if (e.target.value !== draft.customerName) {
                      updateField("customerGstin", "");
                    }
                  }}
                  onFocus={() => { if (partyResults.length > 0) setShowPartyDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                  placeholder="Search party by name..."
                  className="input"
                />
                {showPartyDropdown && partyResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl max-h-60 overflow-y-auto">
                    {partyResults.map((party) => (
                      <button
                        key={party.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateField("customerName", party.name);
                          updateField("customerGstin", party.gstin || "");
                          setPartySearch("");
                          setPartyResults([]);
                          setShowPartyDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-[var(--badge-bg)]"
                      >
                        <p className="font-medium text-default">{party.name}</p>
                        <p className="text-xs text-muted">
                          {party.gstin && `${party.gstin} · `}
                          {party.email || party.phone || ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </label>
              <label className="text-sm text-muted">
                <span className="mb-1 block text-muted">Invoice #</span>
                <input
                  value={draft.invoiceNumber}
                  onChange={(e) => updateField("invoiceNumber", e.target.value)}
                  placeholder="INV-0001"
                  className="input"
                />
              </label>
              <label className="text-sm text-muted">
                <span className="mb-1 block text-muted">GSTIN</span>
                <input
                  value={draft.customerGstin}
                  onChange={(e) => updateField("customerGstin", e.target.value)}
                  placeholder="27AABCU9603R1ZX"
                  className="input"
                />
              </label>
              <label className="text-sm text-muted">
                <span className="mb-1 block text-muted">Due date</span>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => updateField("dueDate", e.target.value)}
                  className="input"
                />
              </label>
            </div>

            <div className="-mx-4 overflow-x-auto rounded-xl border border-default sm:mx-0">
              <table className="min-w-[640px] text-sm sm:min-w-full">
                <thead className="bg-surface-darker text-left text-muted">
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
                        className="border-t border-default bg-surface"
                      >
                        <td className="p-2 relative">
                          <input
                            value={
                              activeProductLine === line.id
                                ? productSearch
                                : draftLines.find((l) => l.id === line.id)
                                    ?.description ?? ""
                            }
                            onChange={(e) => {
                              setProductSearch(e.target.value);
                              setActiveProductLine(line.id);
                              updateLine(line.id, "description", e.target.value);
                            }}
                            onFocus={() => {
                              setActiveProductLine(line.id);
                              if (productResults.length > 0) setShowProductDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => { setShowProductDropdown(false); setActiveProductLine(null); }, 200)}
                            placeholder="Search product or type item..."
                            className="w-full rounded-lg bg-surface-darker px-2 py-1 text-default outline-none ring-0 placeholder:text-muted"
                          />
                          {showProductDropdown && activeProductLine === line.id && productResults.length > 0 && (
                            <div className="absolute z-50 mt-1 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl max-h-48 overflow-y-auto">
                              {productResults.map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectProduct(line.id, product)}
                                  className="w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--badge-bg)]"
                                >
                                  <p className="font-medium text-default">{product.name}</p>
                                  <p className="text-xs text-muted">
                                    {product.hsnCode && `HSN: ${product.hsnCode} · `}
                                    ₹{product.sellingPrice.toLocaleString("en-IN")}
                                    {product.taxRate > 0 && ` · ${product.taxRate}% GST`}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                          {hsnHints.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {hsnHints.map((h) => (
                                <span
                                  key={h.hsnCode}
                                  className="inline-block rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] text-accent-light"
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
                            className="w-20 rounded-lg bg-surface-darker px-2 py-1 text-default outline-none ring-0 placeholder:text-muted"
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
                            className="w-16 rounded-lg bg-surface-darker px-2 py-1 text-center text-default outline-none ring-0"
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
                            className="w-24 rounded-lg bg-surface-darker px-2 py-1 text-right text-default outline-none ring-0"
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
                            className="w-16 rounded-lg bg-surface-darker px-2 py-1 text-center text-default outline-none ring-0"
                          />
                        </td>
                        <td className="p-3 font-medium text-default">
                          {formatAmount(lineTotal, draft.currency)}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="text-xs text-danger"
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
              className="text-sm text-accent-light"
            >
              + Add line item
            </button>

            <div className="space-y-2 rounded-xl bg-surface-darker p-3 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-default">
                  {formatAmount(summary.subtotal, draft.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Tax</span>
                <span className="font-semibold text-default">
                  {formatAmount(summary.taxTotal, draft.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-default pt-2 text-default">
                <span>Total</span>
                <span className="font-semibold">
                  {formatAmount(summary.total, draft.currency)}
                </span>
              </div>
            </div>

            {summary.warnings.length > 0 && (
              <div className="rounded-xl border border-default bg-warning p-3 text-sm text-warning">
                {summary.warnings.join(" • ")}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-default bg-error p-3 text-sm text-danger">
                {error}
              </div>
            )}

            {saved && (
              <div className="rounded-xl border border-default bg-success p-3 text-sm text-success">
                Invoice saved! Redirecting to preview…
              </div>
            )}
          </div>
        </div>

        {/* AI assist side panel */}
        <div className="space-y-6">
          <div className="section-card">
            <h2 className="text-xl font-semibold text-default">AI assist</h2>

            {/* Quick action buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  disabled={action.loading}
                  onClick={() => handleQuickAction(action)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    action.loading
                      ? "border-default bg-accent-subtle text-accent-light"
                      : "border-default bg-accent-subtle text-accent-light hover-brighten"
                  }`}
                >
                  {action.loading ? "Processing…" : action.label}
                </button>
              ))}
            </div>

            {/* HSN suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="section-label">HSN suggestions</p>
                {aiSuggestions.slice(0, 3).map((s) => (
                  <div
                    key={s.title}
                    className="rounded-xl border border-default bg-accent-subtle p-3 text-sm text-accent-light"
                  >
                    <span className="font-medium text-default">{s.title}</span>
                    <p className="mt-0.5 text-muted">{s.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Anomaly flags */}
            {anomalies.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="section-label">Flags ({anomalies.length})</p>
                {anomalies.map((flag) => (
                  <div
                    key={flag.field}
                    className={`rounded-xl border p-3 text-sm ${
                      flag.severity === "critical"
                        ? "border-default bg-error text-danger"
                        : flag.severity === "warning"
                          ? "border-default bg-warning text-warning"
                          : "border-default bg-badge text-muted"
                    }`}
                  >
                    <p className="font-medium text-default">{flag.message}</p>
                    <p className="mt-0.5 text-xs opacity-80">{flag.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {aiSuggestions.length === 0 && anomalies.length === 0 && (
              <div className="mt-4 section-card p-4 text-sm leading-6 text-muted">
                Start typing line items and the AI assistant will suggest HSN
                codes, flag anomalies, and help draft your invoice.
              </div>
            )}
          </div>

          {/* Next actions */}
          <div className="section-card">
            <h2 className="text-xl font-semibold text-default">Next actions</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <button className="w-full rounded-xl border border-default bg-surface-darker p-3 text-left transition hover-brighten">
                Send e-invoice draft
              </button>
              <button className="w-full rounded-xl border border-default bg-surface-darker p-3 text-left transition hover-brighten">
                Schedule reminder for 2 days
              </button>
              <button className="w-full rounded-xl border border-default bg-surface-darker p-3 text-left transition hover-brighten">
                Save as recurring billing template
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

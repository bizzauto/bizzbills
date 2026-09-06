"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatAmount } from "@/lib/currency";
import {
  calculateInvoiceSummary,
  sanitizeInvoiceDraft,
  type InvoiceDraft,
  type InvoiceLine,
} from "@/lib/invoicing";
import Link from "next/link";
import {
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
    { id: "1", description: "", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0, hsnCode: "" },
  ],
};

type Product = { id: string; name: string; hsnCode: string; sellingPrice: number; taxRate: number; unit: string };

export default function BillingPage() {
  const router = useRouter();

  // ── Core state ──
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("mybillbook");
  const [accentColor, setAccentColor] = useState("#2563eb");

  // ── Template settings ──
  const [templateSettings, setTemplateSettings] = useState<{
    invoiceTitle?: string;
    footerNotes?: string;
    orgName?: string;
    orgAddress?: string;
    orgGstin?: string;
  } | null>(null);

  // ── Customer search ──
  const [partySearch, setPartySearch] = useState("");
  const [partyResults, setPartyResults] = useState<{ id: string; name: string; gstin: string; email?: string; phone?: string }[]>([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // ── Product search ──
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [activeProductLine, setActiveProductLine] = useState<string | null>(null);

  // ── Load org settings ──
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
        });
      })
      .catch(() => {});
  }, []);

  // ── Party search ──
  useEffect(() => {
    if (partySearch.length < 2) { setPartyResults([]); setShowPartyDropdown(false); return; }
    const t = setTimeout(() => {
      fetch(`/api/parties?search=${encodeURIComponent(partySearch)}`)
        .then((r) => r.json())
        .then((data) => {
          const parties = Array.isArray(data) ? data : data.parties || [];
          setPartyResults(parties.slice(0, 8));
          setShowPartyDropdown(parties.length > 0);
        })
        .catch(() => setPartyResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [partySearch]);

  // ── Product search ──
  useEffect(() => {
    if (productSearch.length < 2 || !activeProductLine) { setProductResults([]); setShowProductDropdown(false); return; }
    const t = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(productSearch)}`)
        .then((r) => r.json())
        .then((data) => { setProductResults((data.products || []).slice(0, 8)); setShowProductDropdown(true); })
        .catch(() => setProductResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, activeProductLine]);

  // ── Computed ──
  const sanitizedDraft = useMemo(() => sanitizeInvoiceDraft(draft), [draft]);
  const summary = useMemo(() => calculateInvoiceSummary(sanitizedDraft), [sanitizedDraft]);

  const templateData = useMemo<TemplateData>(() => ({
    number: sanitizedDraft.invoiceNumber || "INV-NEW",
    title: templateSettings?.invoiceTitle || "Tax Invoice",
    customerName: sanitizedDraft.customerName || "(Customer)",
    customerGstin: sanitizedDraft.customerGstin,
    date: new Date().toLocaleDateString("en-IN"),
    dueDate: sanitizedDraft.dueDate ? new Date(sanitizedDraft.dueDate).toLocaleDateString("en-IN") : undefined,
    lines: sanitizedDraft.lines.map((l) => ({ description: l.description || "(Item)", hsnCode: l.hsnCode, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate })),
    subtotal: summary.subtotal, taxTotal: summary.taxTotal, total: summary.total,
    currency: sanitizedDraft.currency,
    notes: templateSettings?.footerNotes || "Payment due within 7 days. Thank you for your business.",
    orgName: templateSettings?.orgName || "BizzBills",
    orgAddress: templateSettings?.orgAddress,
    orgGstin: templateSettings?.orgGstin,
    isPaid: false, accentColor,
  }), [sanitizedDraft, summary, accentColor, templateSettings]);

  // ── Helpers ──
  function updateField<K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(id: string, field: keyof InvoiceLine, value: string | number) {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === id ? { ...line, [field]: field === "description" || field === "hsnCode" ? (value as string) : value === "" || value === undefined ? 0 : Number(value) || 0 } : line
      ),
    }));
  }

  function addLine() {
    setDraft((prev) => ({
      ...prev,
      lines: [...prev.lines, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0, hsnCode: "" }],
    }));
  }

  function removeLine(id: string) {
    setDraft((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  }

  function selectProduct(lineId: string, product: Product) {
    updateLine(lineId, "description", product.name);
    updateLine(lineId, "hsnCode", product.hsnCode || "");
    updateLine(lineId, "unitPrice", product.sellingPrice || 0);
    updateLine(lineId, "taxRate", product.taxRate || 0);
    setProductSearch(""); setProductResults([]); setShowProductDropdown(false); setActiveProductLine(null);
  }

  // ── Save ──
  async function handleSave() {
    if (!summary.isValid) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sanitizedDraft) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save"); }
      const invoice = await res.json();
      // Journal entries are auto-posted server-side inside the invoice
      // creation transaction (see src/lib/journal.ts) — no client-side
      // accounting calls here.
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const draftLines = draft.lines;
  const cur = draft.currency;

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[var(--nav-bg)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-sm text-muted hover:text-default transition">← Back</Link>
          <h1 className="text-base font-semibold text-default">New Invoice</h1>
          <button onClick={() => setShowPreview(!showPreview)} className="text-sm font-medium text-accent-light">
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
      </header>

      {/* ── Preview Mode ── */}
      {showPreview && (
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="rounded-2xl border border-[var(--card-border)] bg-white overflow-hidden shadow-lg">
            <InvoiceTemplate template={selectedTemplate} data={templateData} />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => window.print()} className="flex-1 rounded-xl bg-[var(--card)] border border-[var(--card-border)] py-3 text-sm font-medium text-default">🖨 Print</button>
            <button onClick={handleSave} disabled={!summary.isValid || saving} className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save & Send"}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Mode ── */}
      {!showPreview && (
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">

          {/* ── Customer Section ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Customer</h2>
            <div className="space-y-3">
              <div className="relative">
                <input
                  value={partySearch || draft.customerName}
                  onChange={(e) => { setPartySearch(e.target.value); updateField("customerName", e.target.value); if (e.target.value !== draft.customerName) updateField("customerGstin", ""); }}
                  onFocus={() => { if (partyResults.length > 0) setShowPartyDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                  placeholder="Search or enter customer name"
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-default outline-none focus:border-accent placeholder:text-muted"
                />
                {showPartyDropdown && partyResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl max-h-48 overflow-y-auto">
                    {partyResults.map((p) => (
                      <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { updateField("customerName", p.name); updateField("customerGstin", p.gstin || ""); setPartySearch(""); setShowPartyDropdown(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-[var(--badge-bg)]">
                        <p className="font-medium text-default">{p.name}</p>
                        <p className="text-xs text-muted">{p.gstin && `GSTIN: ${p.gstin}`}{p.phone && ` · ${p.phone}`}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={draft.customerGstin} onChange={(e) => updateField("customerGstin", e.target.value)} placeholder="GSTIN (optional)" className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-default outline-none placeholder:text-muted" />
                <input value={draft.invoiceNumber} onChange={(e) => updateField("invoiceNumber", e.target.value)} placeholder="Invoice #" className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-default outline-none placeholder:text-muted" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Date</label>
                  <input type="date" value={new Date().toISOString().split("T")[0]} readOnly className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-default outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Due Date</label>
                  <input type="date" value={draft.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-default outline-none" />
                </div>
              </div>
            </div>
          </section>

          {/* ── Items Section ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Items</h2>
              <button onClick={addLine} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-light">+ Add Item</button>
            </div>

            <div className="space-y-3">
              {draftLines.map((line, index) => {
                const lineTotal = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
                return (
                  <div key={line.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3">
                    <div className="relative mb-2">
                      <input
                        value={activeProductLine === line.id ? productSearch : line.description}
                        onChange={(e) => { setProductSearch(e.target.value); setActiveProductLine(line.id); updateLine(line.id, "description", e.target.value); }}
                        onFocus={() => { setActiveProductLine(line.id); if (productResults.length > 0) setShowProductDropdown(true); }}
                        onBlur={() => setTimeout(() => { setShowProductDropdown(false); setActiveProductLine(null); }, 200)}
                        placeholder="Search product or enter item name"
                        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-default outline-none placeholder:text-muted"
                      />
                      {showProductDropdown && activeProductLine === line.id && productResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl max-h-40 overflow-y-auto">
                          {productResults.map((prod) => (
                            <button key={prod.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectProduct(line.id, prod)}
                              className="w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--badge-bg)]">
                              <p className="font-medium text-default">{prod.name}</p>
                              <p className="text-xs text-muted">₹{prod.sellingPrice.toLocaleString("en-IN")} · {prod.taxRate}% GST</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted">Qty</label>
                        <input type="number" min={0} value={line.quantity || ""} onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-center text-sm text-default outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted">Rate (₹)</label>
                        <input type="number" min={0} value={line.unitPrice || ""} onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-right text-sm text-default outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-muted">GST %</label>
                        <input type="number" min={0} max={100} value={line.taxRate || ""} onChange={(e) => updateLine(line.id, "taxRate", e.target.value)}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-center text-sm text-default outline-none" />
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <span className="text-[10px] text-muted">Amount</span>
                        <span className="text-sm font-semibold text-default">{formatAmount(lineTotal, cur)}</span>
                        {draftLines.length > 1 && (
                          <button onClick={() => removeLine(line.id)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <input value={line.hsnCode} onChange={(e) => updateLine(line.id, "hsnCode", e.target.value)} placeholder="HSN"
                        className="w-24 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-xs text-default outline-none placeholder:text-muted" />
                      {line.taxRate > 0 && (
                        <span className="text-[10px] text-muted">CGST {(line.taxRate / 2).toFixed(1)}% + SGST {(line.taxRate / 2).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Template & Color ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Invoice Style</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["mybillbook", "classic", "modern", "minimal", "premium", "best", "corporate", "compact"] as TemplateId[]).map((t) => (
                <button key={t} onClick={() => setSelectedTemplate(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${selectedTemplate === t ? "bg-accent text-white" : "border border-[var(--card-border)] text-muted hover:text-default"}`}>
                  {t === "mybillbook" ? "Super" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Color:</span>
              {["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((c) => (
                <button key={c} onClick={() => setAccentColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition ${accentColor === c ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </section>

          {/* ── Notes ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Notes & Terms</h2>
            <textarea value={templateSettings?.footerNotes || ""} onChange={(e) => setTemplateSettings((prev) => ({ ...prev, footerNotes: e.target.value }))}
              placeholder="Payment due within 7 days. Thank you for your business."
              rows={2} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-default outline-none resize-none placeholder:text-muted" />
          </section>

          {/* ── Error ── */}
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          )}

          {/* ── Warnings ── */}
          {summary.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-300">
              {summary.warnings.join(" • ")}
            </div>
          )}
        </div>
      )}

      {/* ── Floating Total Bar ── */}
      {!showPreview && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--card-border)] bg-[var(--nav-bg)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs text-muted">Total</p>
              <p className="text-lg font-bold text-default">{formatAmount(summary.total, cur)}</p>
              <p className="text-[10px] text-muted">Subtotal {formatAmount(summary.subtotal, cur)} + Tax {formatAmount(summary.taxTotal, cur)}</p>
            </div>
            <button onClick={handleSave} disabled={!summary.isValid || saving}
              className="rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save Invoice"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

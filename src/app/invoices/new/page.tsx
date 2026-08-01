"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatAmount } from "@/lib/currency";

type LineItem = {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
};

type InvoiceForm = {
  // Invoice details
  invoiceNumber: string;
  invoicePrefix: string;
  invoicePostfix: string;
  invoiceTitle: string;
  date: string;
  dueDate: string;
  referenceNumber: string;
  poNumber: string;

  // Customer details
  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;
  customerGstin: string;
  customerState: string;

  // Shipping details
  shippingSameAsBilling: boolean;
  shippingName: string;
  shippingAddress: string;
  shippingPhone: string;

  // Place of supply
  placeOfSupply: string;
  reverseCharge: boolean;

  // Items
  lines: LineItem[];

  // Discount & Charges
  discountPercent: number;
  discountAmount: number;
  shippingCharges: number;
  adjustment: number;
  isTaxInclusive: boolean;

  // Notes & Terms
  notes: string;
  terms: string;

  // Bank details
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  upiId: string;

  // Signature
  signatureName: string;
  signatureDesignation: string;
};

const TAX_RATES = [0, 5, 12, 18, 28];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
  "Andaman & Nicobar", "Dadra & Nagar Haveli", "Daman & Diu", "Lakshadweep",
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertBelow1000 = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertBelow1000(n % 100) : "");
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  let result = "";
  if (wholePart >= 10000000) {
    result += convertBelow1000(Math.floor(wholePart / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (wholePart >= 100000) {
    result += convertBelow1000(Math.floor((wholePart % 10000000) / 100000)) + " Lakh ";
  }
  if (wholePart >= 1000) {
    result += convertBelow1000(Math.floor((wholePart % 100000) / 1000)) + " Thousand ";
  }
  if (wholePart % 1000 > 0) {
    result += convertBelow1000(wholePart % 1000);
  }

  result = result.trim() + " Rupees";
  if (decimalPart > 0) {
    result += " and " + convertBelow1000(decimalPart) + " Paise";
  }
  result += " Only";

  return result;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [orgSettings, setOrgSettings] = useState<Record<string, unknown>>({});

  const [form, setForm] = useState<InvoiceForm>({
    invoiceNumber: "",
    invoicePrefix: "INV-",
    invoicePostfix: "",
    invoiceTitle: "Tax Invoice",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    referenceNumber: "",
    poNumber: "",
    customerName: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    customerGstin: "",
    customerState: "",
    shippingSameAsBilling: true,
    shippingName: "",
    shippingAddress: "",
    shippingPhone: "",
    placeOfSupply: "",
    reverseCharge: false,
    lines: [{ id: generateId(), description: "", hsnCode: "", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }],
    discountPercent: 0,
    discountAmount: 0,
    shippingCharges: 0,
    adjustment: 0,
    isTaxInclusive: false,
    notes: "",
    terms: "Payment due within 7 days. Thank you for your business.",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    upiId: "",
    signatureName: "",
    signatureDesignation: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    // Load org settings for bank details and defaults
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data) => {
        setOrgSettings(data);
        setForm((prev) => ({
          ...prev,
          bankName: data.bankName || "",
          bankAccountNumber: data.accountNumber || "",
          bankAccountName: data.accountName || "",
          bankIfsc: data.ifscCode || "",
          upiId: data.upiId || "",
        }));
      })
      .catch(() => {});
  }, [status, router]);

  // Auto-generate invoice number
  useEffect(() => {
    const timestamp = Date.now().toString().slice(-6);
    setForm((prev) => ({
      ...prev,
      invoiceNumber: `${prev.invoicePrefix}${timestamp}${prev.invoicePostfix}`,
    }));
  }, [form.invoicePrefix, form.invoicePostfix]);

  const updateField = useCallback(<K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateLine = useCallback((id: string, updates: Partial<LineItem>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...updates } : line)),
    }));
  }, []);

  const addLine = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { id: generateId(), description: "", hsnCode: "", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }],
    }));
  }, []);

  const removeLine = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== id),
    }));
  }, []);

  // Calculations
  const calculations = (() => {
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalDiscount = 0;

    const cgstMap: Record<number, number> = {};
    const sgstMap: Record<number, number> = {};
    const igstMap: Record<number, number> = {};

    const isInterState = form.customerState && form.placeOfSupply && form.customerState !== form.placeOfSupply;

    form.lines.forEach((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      const lineDiscount = lineTotal * (line.discount / 100);
      const taxableAmount = lineTotal - lineDiscount;
      const taxAmount = taxableAmount * (line.taxRate / 100);

      subtotal += lineTotal;
      totalDiscount += lineDiscount;

      if (isInterState) {
        totalIgst += taxAmount;
        igstMap[line.taxRate] = (igstMap[line.taxRate] || 0) + taxAmount;
      } else {
        const halfTax = taxAmount / 2;
        totalCgst += halfTax;
        totalSgst += halfTax;
        cgstMap[line.taxRate] = (cgstMap[line.taxRate] || 0) + halfTax;
        sgstMap[line.taxRate] = (sgstMap[line.taxRate] || 0) + halfTax;
      }
    });

    const afterDiscount = subtotal - totalDiscount;
    const beforeShipping = afterDiscount;
    const grandTotal = beforeShipping + form.shippingCharges - form.adjustment + (form.isTaxInclusive ? 0 : totalCgst + totalSgst + totalIgst);
    const taxTotal = totalCgst + totalSgst + totalIgst;
    const finalTotal = form.isTaxInclusive ? afterDiscount : grandTotal;
    const roundedTotal = Math.round(finalTotal);
    const roundOff = roundedTotal - finalTotal;

    return {
      subtotal, totalDiscount, totalCgst, totalSgst, totalIgst,
      cgstMap, sgstMap, igstMap,
      taxTotal, grandTotal: roundedTotal, roundOff, isInterState,
      amountInWords: numberToWords(roundedTotal),
    };
  })();

  const handleSubmit = useCallback(async (asDraft: boolean) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        subtotal: calculations.subtotal,
        taxTotal: calculations.taxTotal,
        total: calculations.grandTotal,
        discountAmount: calculations.totalDiscount,
        roundOff: calculations.roundOff,
        amountInWords: calculations.amountInWords,
        status: asDraft ? "draft" : "pending",
        lines: form.lines.filter((l) => l.description.trim()),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const invoice = await res.json();
        router.push(`/invoices/${invoice.id}`);
      }
    } catch {
      alert("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }, [form, calculations, router]);

  if (status === "loading") {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  return (
    <main className="mx-auto max-w-5xl pb-10">
      {/* Header */}
      <section className="section-card mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">Billing</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Create Invoice</h1>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => handleSubmit(true)} disabled={saving} className="btn-secondary">
              Save as Draft
            </button>
            <button type="button" onClick={() => handleSubmit(false)} disabled={saving} className="btn-primary">
              {saving ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Form */}
        <div className="space-y-6">
          {/* Invoice Details */}
          <section className="section-card">
            <h2 className="section-label">Invoice Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted">
                Invoice Title
                <select value={form.invoiceTitle} onChange={(e) => updateField("invoiceTitle", e.target.value)} className="input mt-1 w-full">
                  <option>Tax Invoice</option>
                  <option>Invoice</option>
                  <option>Bill</option>
                  <option>Tax Bill</option>
                  <option>Proforma Invoice</option>
                  <option>Service Invoice</option>
                </select>
              </label>
              <label className="text-sm text-muted">
                Invoice Number
                <div className="flex gap-2 mt-1">
                  <input value={form.invoicePrefix} onChange={(e) => updateField("invoicePrefix", e.target.value)} className="input w-24" placeholder="INV-" />
                  <input value={form.invoiceNumber} onChange={(e) => updateField("invoiceNumber", e.target.value)} className="input flex-1" />
                  <input value={form.invoicePostfix} onChange={(e) => updateField("invoicePostfix", e.target.value)} className="input w-20" placeholder="/24-25" />
                </div>
              </label>
              <label className="text-sm text-muted">
                Invoice Date *
                <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} className="input mt-1 w-full" />
              </label>
              <label className="text-sm text-muted">
                Due Date *
                <input type="date" value={form.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} className="input mt-1 w-full" />
              </label>
              <label className="text-sm text-muted">
                PO Number
                <input value={form.poNumber} onChange={(e) => updateField("poNumber", e.target.value)} className="input mt-1 w-full" placeholder="Purchase Order Number" />
              </label>
              <label className="text-sm text-muted">
                Reference Number
                <input value={form.referenceNumber} onChange={(e) => updateField("referenceNumber", e.target.value)} className="input mt-1 w-full" placeholder="Internal reference" />
              </label>
            </div>
          </section>

          {/* Customer Details */}
          <section className="section-card">
            <h2 className="section-label">Customer / Bill To</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted">
                Customer Name *
                <input value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} className="input mt-1 w-full" placeholder="Customer / Company name" />
              </label>
              <label className="text-sm text-muted">
                GSTIN
                <input value={form.customerGstin} onChange={(e) => updateField("customerGstin", e.target.value.toUpperCase())} className="input mt-1 w-full" placeholder="22AAAAA0000A1Z5" maxLength={15} />
              </label>
              <label className="text-sm text-muted md:col-span-2">
                Address
                <textarea value={form.customerAddress} onChange={(e) => updateField("customerAddress", e.target.value)} className="input mt-1 w-full resize-none" rows={2} placeholder="Full billing address" />
              </label>
              <label className="text-sm text-muted">
                Email
                <input type="email" value={form.customerEmail} onChange={(e) => updateField("customerEmail", e.target.value)} className="input mt-1 w-full" placeholder="customer@email.com" />
              </label>
              <label className="text-sm text-muted">
                Phone
                <input value={form.customerPhone} onChange={(e) => updateField("customerPhone", e.target.value)} className="input mt-1 w-full" placeholder="+91 98765 43210" />
              </label>
              <label className="text-sm text-muted">
                State *
                <select value={form.customerState} onChange={(e) => updateField("customerState", e.target.value)} className="input mt-1 w-full">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-sm text-muted">
                Place of Supply *
                <select value={form.placeOfSupply} onChange={(e) => updateField("placeOfSupply", e.target.value)} className="input mt-1 w-full">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={form.reverseCharge} onChange={(e) => updateField("reverseCharge", e.target.checked)} className="rounded" />
              Reverse Charge Applicable
            </label>
          </section>

          {/* Shipping Details */}
          <section className="section-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-label mb-0">Ship To</h2>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={form.shippingSameAsBilling} onChange={(e) => updateField("shippingSameAsBilling", e.target.checked)} className="rounded" />
                Same as billing
              </label>
            </div>
            {!form.shippingSameAsBilling && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-muted">
                  Recipient Name
                  <input value={form.shippingName} onChange={(e) => updateField("shippingName", e.target.value)} className="input mt-1 w-full" />
                </label>
                <label className="text-sm text-muted">
                  Phone
                  <input value={form.shippingPhone} onChange={(e) => updateField("shippingPhone", e.target.value)} className="input mt-1 w-full" />
                </label>
                <label className="text-sm text-muted md:col-span-2">
                  Shipping Address
                  <textarea value={form.shippingAddress} onChange={(e) => updateField("shippingAddress", e.target.value)} className="input mt-1 w-full resize-none" rows={2} />
                </label>
              </div>
            )}
          </section>

          {/* Line Items */}
          <section className="section-card">
            <h2 className="section-label">Line Items</h2>
            <div className="space-y-3">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[1fr_80px_100px_80px_100px_80px_100px_40px] gap-2 text-xs font-medium text-muted px-1">
                <span>Description</span>
                <span>HSN/SAC</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate (₹)</span>
                <span className="text-right">Disc %</span>
                <span className="text-center">GST %</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              {form.lines.map((line, i) => {
                const lineAmount = line.quantity * line.unitPrice;
                const lineDiscount = lineAmount * (line.discount / 100);
                const taxable = lineAmount - lineDiscount;
                const tax = taxable * (line.taxRate / 100);
                return (
                  <div key={line.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3 md:p-4">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_80px_100px_80px_100px_40px] gap-2 items-start">
                      <input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} className="input w-full" placeholder={`Item ${i + 1}`} />
                      <input value={line.hsnCode} onChange={(e) => updateLine(line.id, { hsnCode: e.target.value })} className="input w-full text-center" placeholder="HSN" />
                      <input type="number" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 1 })} className="input w-full text-right" min="0.01" step="0.01" />
                      <input type="number" value={line.unitPrice} onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })} className="input w-full text-right" min="0" step="0.01" />
                      <input type="number" value={line.discount} onChange={(e) => updateLine(line.id, { discount: Number(e.target.value) || 0 })} className="input w-full text-right" min="0" max="100" step="0.01" />
                      <select value={line.taxRate} onChange={(e) => updateLine(line.id, { taxRate: Number(e.target.value) })} className="input w-full text-center">
                        {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                      <div className="input w-full text-right bg-transparent border-none font-semibold text-default">{formatAmount(taxable + tax)}</div>
                      <button type="button" onClick={() => removeLine(line.id)} className="text-danger hover:text-danger/80 text-lg p-2">✕</button>
                    </div>
                    {/* Mobile line total */}
                    <div className="md:hidden mt-2 flex justify-between text-sm text-muted">
                      <span>Qty: {line.quantity} × ₹{line.unitPrice} = ₹{lineAmount.toFixed(2)}</span>
                      <span>+ {line.taxRate}% GST = ₹{tax.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}

              <button type="button" onClick={addLine} className="w-full rounded-xl border border-dashed border-[var(--card-border)] p-3 text-sm text-muted transition hover:border-accent/40 hover:text-accent">
                + Add Line Item
              </button>
            </div>
          </section>

          {/* Notes & Terms */}
          <section className="section-card">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted">
                Notes
                <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="input mt-1 w-full resize-none" rows={3} placeholder="Additional notes for the customer..." />
              </label>
              <label className="text-sm text-muted">
                Terms & Conditions
                <textarea value={form.terms} onChange={(e) => updateField("terms", e.target.value)} className="input mt-1 w-full resize-none" rows={3} />
              </label>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <section className="section-card sticky top-4">
            <h2 className="section-label">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>₹{calculations.subtotal.toFixed(2)}</span></div>
              {calculations.totalDiscount > 0 && <div className="flex justify-between text-danger"><span>Discount</span><span>-₹{calculations.totalDiscount.toFixed(2)}</span></div>}
              {form.shippingCharges > 0 && <div className="flex justify-between text-muted"><span>Shipping</span><span>₹{form.shippingCharges.toFixed(2)}</span></div>}
              {form.adjustment > 0 && <div className="flex justify-between text-muted"><span>Adjustment</span><span>-₹{form.adjustment.toFixed(2)}</span></div>}

              {/* Tax breakup */}
              {calculations.isInterState ? (
                <div className="flex justify-between text-muted"><span>IGST</span><span>₹{calculations.totalIgst.toFixed(2)}</span></div>
              ) : (
                <>
                  {Object.entries(calculations.cgstMap).map(([rate, amt]) => (
                    <div key={`cgst-${rate}`} className="flex justify-between text-muted text-xs">
                      <span>CGST @ {rate/2}%</span><span>₹{(amt as number).toFixed(2)}</span>
                    </div>
                  ))}
                  {Object.entries(calculations.sgstMap).map(([rate, amt]) => (
                    <div key={`sgst-${rate}`} className="flex justify-between text-muted text-xs">
                      <span>SGST @ {rate/2}%</span><span>₹{(amt as number).toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}

              {calculations.roundOff !== 0 && <div className="flex justify-between text-muted"><span>Round Off</span><span>₹{calculations.roundOff.toFixed(2)}</span></div>}

              <div className="flex justify-between border-t border-[var(--card-border)] pt-2 text-base font-bold text-default">
                <span>Total</span>
                <span className="text-accent">₹{calculations.grandTotal.toFixed(2)}</span>
              </div>

              <p className="text-xs text-muted italic mt-2">{calculations.amountInWords}</p>
            </div>

            {/* Discounts & Charges */}
            <div className="mt-4 space-y-3 border-t border-[var(--card-border)] pt-4">
              <label className="text-xs text-muted">
                Discount (%)
                <input type="number" value={form.discountPercent} onChange={(e) => updateField("discountPercent", Number(e.target.value) || 0)} className="input mt-1 w-full" min="0" max="100" step="0.01" />
              </label>
              <label className="text-xs text-muted">
                Shipping Charges (₹)
                <input type="number" value={form.shippingCharges} onChange={(e) => updateField("shippingCharges", Number(e.target.value) || 0)} className="input mt-1 w-full" min="0" step="0.01" />
              </label>
              <label className="text-xs text-muted">
                Adjustment (₹)
                <input type="number" value={form.adjustment} onChange={(e) => updateField("adjustment", Number(e.target.value) || 0)} className="input mt-1 w-full" min="0" step="0.01" />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={form.isTaxInclusive} onChange={(e) => updateField("isTaxInclusive", e.target.checked)} className="rounded" />
                Tax Inclusive (prices include GST)
              </label>
            </div>

            {/* Bank Details */}
            <div className="mt-4 space-y-3 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-medium text-default">Bank Details</p>
              <label className="text-xs text-muted">
                Bank Name
                <input value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-muted">
                Account Name
                <input value={form.bankAccountName} onChange={(e) => updateField("bankAccountName", e.target.value)} className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-muted">
                Account Number
                <input value={form.bankAccountNumber} onChange={(e) => updateField("bankAccountNumber", e.target.value)} className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-muted">
                IFSC Code
                <input value={form.bankIfsc} onChange={(e) => updateField("bankIfsc", e.target.value.toUpperCase())} className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-muted">
                UPI ID
                <input value={form.upiId} onChange={(e) => updateField("upiId", e.target.value)} className="input mt-1 w-full" placeholder="name@upi" />
              </label>
            </div>

            {/* Signature */}
            <div className="mt-4 space-y-3 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-medium text-default">Authorized Signatory</p>
              <label className="text-xs text-muted">
                Name
                <input value={form.signatureName} onChange={(e) => updateField("signatureName", e.target.value)} className="input mt-1 w-full" placeholder="Authorized signatory name" />
              </label>
              <label className="text-xs text-muted">
                Designation
                <input value={form.signatureDesignation} onChange={(e) => updateField("signatureDesignation", e.target.value)} className="input mt-1 w-full" placeholder="Director / Manager" />
              </label>
            </div>

            {/* Action buttons */}
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => handleSubmit(true)} disabled={saving} className="btn-secondary w-full">Save as Draft</button>
              <button type="button" onClick={() => handleSubmit(false)} disabled={saving} className="btn-primary w-full">{saving ? "Creating..." : "Create & Send"}</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

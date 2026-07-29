"use client";

import { formatAmount } from "@/lib/currency";

/* ───────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────── */
export type TemplateId = "classic" | "modern" | "minimal" | "premium";

export interface TemplateData {
  number: string;
  title: string;
  customerName: string;
  customerAddress?: string;
  customerGstin?: string;
  customerEmail?: string;
  customerPhone?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  poNumber?: string;
  lines: TemplateLine[];
  subtotal: number;
  discount?: number;
  taxTotal: number;
  shippingCharges?: number;
  total: number;
  currency?: string;
  notes?: string;
  terms?: string;
  orgName: string;
  orgAddress?: string;
  orgGstin?: string;
  orgEmail?: string;
  orgPhone?: string;
  orgLogo?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  upiId?: string;
  signature?: string;
  isPaid?: boolean;
  paymentMethod?: string;
}

export interface TemplateLine {
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

/* ───────────────────────────────────────────────
   Template Metadata
   ─────────────────────────────────────────────── */
export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  preview: string;
  bestFor: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    name: "Classic GST",
    description: "Traditional Indian GST invoice format with HSN codes and tax breakup",
    preview: "📋",
    bestFor: "GST-compliant businesses, B2B invoices",
  },
  {
    id: "modern",
    name: "Modern Clean",
    description: "Clean, minimal design with bold typography and lots of white space",
    preview: "✨",
    bestFor: "Service businesses, freelancers, startups",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Ultra-minimal, no-frills layout — prints fast and clear",
    preview: "◻️",
    bestFor: "Quick invoices, retail, high-volume billing",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Feature-rich layout with company branding, payment details, and signature block",
    preview: "👑",
    bestFor: "Enterprise, branded invoices, exports",
  },
];

/* ───────────────────────────────────────────────
   Template Selector Component
   ─────────────────────────────────────────────── */
export function TemplateSelector({
  selected,
  onChange,
}: {
  selected: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TEMPLATES.map((t) => {
        const active = selected === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
              active
                ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                : "border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/70"
            }`}
          >
            <span className="text-xl">{t.preview}</span>
            <p className={`mt-1.5 text-xs font-semibold ${active ? "text-cyan-200" : "text-white"}`}>
              {t.name}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-slate-400 line-clamp-2">
              {t.bestFor}
            </p>
            {active && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] text-slate-950 font-bold">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Template Renderer
   ─────────────────────────────────────────────── */
export function InvoiceTemplate({
  template,
  data,
}: {
  template: TemplateId;
  data: TemplateData;
}) {
  switch (template) {
    case "classic": return <ClassicGSTTemplate data={data} />;
    case "modern": return <ModernCleanTemplate data={data} />;
    case "minimal": return <MinimalTemplate data={data} />;
    case "premium": return <PremiumTemplate data={data} />;
  }
}

/* ───────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────── */
const currency = (d: TemplateData) => d.currency || "INR";
const lineTotal = (l: TemplateLine) => l.quantity * l.unitPrice * (1 + l.taxRate / 100);

/* ===================================================================
   CLASSIC GST TEMPLATE
   =================================================================== */
function ClassicGSTTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header with cyan accent bar */}
      <div style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", height: "6px", borderRadius: "3px 3px 0 0", margin: "-40px -40px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: "28px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{data.orgName}</h1>
          {data.orgAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{data.orgAddress}</p>}
          {data.orgGstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}><strong>GSTIN:</strong> {data.orgGstin}</p>}
          {data.orgEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgEmail}</p>}
          {data.orgPhone && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgPhone}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "white", padding: "8px 20px", borderRadius: "6px", marginBottom: "8px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, opacity: 0.9 }}>{data.title}</p>
            <p style={{ fontSize: "16px", fontWeight: "700", margin: "2px 0 0", letterSpacing: "-0.01em" }}>{data.number}</p>
          </div>
          {data.poNumber && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>PO: {data.poNumber}</p>}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "2px solid #e2e8f0", margin: "20px 0" }} />

      {/* Bill To + Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px" }}>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", margin: "0 0 6px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: 0 }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.4 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: "#475569", margin: "4px 0 0" }}>GSTIN: {data.customerGstin}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        <div style={{ textAlign: "right", paddingTop: "4px" }}>
          <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                ["Invoice Date:", data.date] as const,
                ["Due Date:", data.dueDate || "—"] as const,
                ...(data.validUntil ? [["Valid Until:", data.validUntil] as const] : []),
              ].map(([label, val]) => (
                <tr key={String(label)}>
                  <td style={{ padding: "2px 12px 2px 0", color: "#94a3b8", textAlign: "right", whiteSpace: "nowrap" }}>{label}</td>
                  <td style={{ padding: "2px 0", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{val as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>#</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>Description</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>HSN/SAC</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>Qty</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>Rate</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>GST%</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #cbd5e1" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "11px" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "'Courier New', monospace", fontSize: "11px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ width: "260px" }}>
          {[
            ["Subtotal:", formatAmount(data.subtotal, cur)],
            ["GST Total:", formatAmount(data.taxTotal, cur)],
            ...(data.discount ? [["Discount:", `-${formatAmount(data.discount, cur)}`]] : []),
            ...(data.shippingCharges ? [["Shipping:", formatAmount(data.shippingCharges, cur)]] : []),
          ].map(([label, val], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span>
              <span style={{ color: "#475569", fontWeight: 500 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: "2px solid #06b6d4", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
            <span>Total</span>
            <span style={{ color: "#0891b2" }}>{formatAmount(data.total, cur)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "right", marginTop: "2px" }}>
            {data.isPaid ? "✓ Paid" : "Amount in " + cur}
          </div>
        </div>
      </div>

      {/* Amount in Words placeholder */}
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "16px", padding: "10px 14px", background: "#f8fafc", borderRadius: "6px", borderLeft: "3px solid #06b6d4" }}>
        <strong>Amount in Words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#fffbeb", borderRadius: "6px", fontSize: "11px", color: "#92400e", border: "1px solid #fde68a" }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Terms */}
      {data.terms && (
        <div style={{ marginBottom: "16px", fontSize: "11px", color: "#64748b" }}>
          <strong>Terms & Conditions:</strong> {data.terms}
        </div>
      )}

      {/* Bank Details */}
      {data.bankName && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", color: "#64748b" }}>
          <div><strong>Bank:</strong> {data.bankName}</div>
          <div><strong>A/C No:</strong> {data.bankAccount}</div>
          <div><strong>IFSC:</strong> {data.bankIfsc}</div>
          {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
        </div>
      )}

      {/* Signature */}
      {data.signature && (
        <div style={{ marginTop: "24px", textAlign: "right", fontSize: "12px", color: "#475569" }}>
          <div style={{ marginBottom: "6px" }}>Authorized Signature</div>
          <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: "18px", color: "#0f172a" }}>{data.signature}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
        Generated by BizzBills • {data.isPaid && data.paymentMethod ? `Paid via ${data.paymentMethod}` : ""} • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

/* ===================================================================
   MODERN CLEAN TEMPLATE
   =================================================================== */
function ModernCleanTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: "white", color: "#1e293b", padding: "48px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          {data.orgLogo ? (
            <img src={data.orgLogo} alt="Logo" style={{ height: "48px", marginBottom: "8px" }} />
          ) : (
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
              {data.orgName.charAt(0)}
            </div>
          )}
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: 0, letterSpacing: "-0.03em" }}>{data.orgName}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#94a3b8", margin: "0 0 4px", fontWeight: 600 }}>{data.title}</p>
          <p style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: 0, letterSpacing: "-0.03em" }}>{data.number}</p>
          {data.isPaid !== undefined && (
            <span style={{ display: "inline-block", marginTop: "8px", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, background: data.isPaid ? "#d1fae5" : "#fef3c7", color: data.isPaid ? "#065f46" : "#92400e" }}>
              {data.isPaid ? "✓ PAID" : "PENDING"}
            </span>
          )}
        </div>
      </div>

      {/* Thin accent line */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #06b6d4, #06b6d4 40%, #e2e8f0 40%)", borderRadius: "2px", marginBottom: "32px" }} />

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
        <div>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerEmail && <p style={{ fontSize: "12px", color: "#64748b", margin: "0" }}>{data.customerEmail}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 0" }}>GST: {data.customerGstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                ["Date", data.date],
                ["Due", data.dueDate || "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: "3px 16px 3px 0", color: "#94a3b8", textAlign: "right" }}>{label}</td>
                  <td style={{ padding: "3px 0", color: "#0f172a", fontWeight: 600 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            {["Description", "Qty", "Rate", "GST", "Amount"].map((h) => (
              <th key={h} style={{ padding: "10px 8px", textAlign: h === "Description" ? "left" : "right", color: "#94a3b8", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 8px", color: "#0f172a", fontWeight: 500 }}>
                {line.description}
                {line.hsnCode && <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>HSN: {line.hsnCode}</span>}
              </td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <div style={{ width: "240px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}>
            <span>Subtotal</span><span style={{ fontWeight: 500, color: "#475569" }}>{formatAmount(data.subtotal, cur)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#64748b" }}>
            <span>GST</span><span style={{ fontWeight: 500, color: "#475569" }}>{formatAmount(data.taxTotal, cur)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: "4px", borderTop: "2px solid #0f172a", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
            <span>Total</span><span style={{ color: "#06b6d4" }}>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {data.notes && (
        <div style={{ marginBottom: "12px", padding: "16px", background: "#f1f5f9", borderRadius: "8px", fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: "#0f172a", display: "block", marginBottom: "4px" }}>Notes</span>
          {data.notes}
        </div>
      )}
      {data.terms && (
        <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 500, color: "#64748b" }}>Terms: </span>{data.terms}
        </div>
      )}

      <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "10px", color: "#94a3b8", textAlign: "center" }}>
        {data.orgName} • {data.orgEmail || ""} • Generated by BizzBills
      </div>
    </div>
  );
}

/* ===================================================================
   MINIMAL TEMPLATE
   =================================================================== */
function MinimalTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: "white", color: "#1e293b", padding: "36px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>{data.orgName}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 2px" }}>{data.title}</p>
          <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>{data.number}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", marginBottom: "24px", fontSize: "12px" }}>
        <div>
          <p style={{ color: "#94a3b8", margin: "0 0 2px", fontSize: "10px", textTransform: "uppercase" }}>Customer</p>
          <p style={{ fontWeight: 600, color: "#0f172a", margin: 0 }}>{data.customerName}</p>
          {data.customerGstin && <p style={{ color: "#64748b", margin: "2px 0 0", fontSize: "11px" }}>GST: {data.customerGstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "#64748b", margin: "0" }}>{data.date}{data.dueDate ? ` | Due: ${data.dueDate}` : ""}</p>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "16px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: "8px 6px", textAlign: "left", color: "#94a3b8", fontWeight: 500, fontSize: "10px" }}>Item</th>
            <th style={{ padding: "8px 6px", textAlign: "right", color: "#94a3b8", fontWeight: 500, fontSize: "10px" }}>Qty</th>
            <th style={{ padding: "8px 6px", textAlign: "right", color: "#94a3b8", fontWeight: 500, fontSize: "10px" }}>Rate</th>
            <th style={{ padding: "8px 6px", textAlign: "right", color: "#94a3b8", fontWeight: 500, fontSize: "10px" }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 6px", color: "#0f172a" }}>{line.description}</td>
              <td style={{ padding: "10px 6px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "10px 6px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 6px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "2px solid #0f172a", paddingTop: "8px", textAlign: "right", fontSize: "15px", fontWeight: 700 }}>
        Total: {formatAmount(data.total, cur)}
      </div>

      {data.notes && <div style={{ marginTop: "16px", fontSize: "11px", color: "#64748b" }}>📝 {data.notes}</div>}

      <div style={{ marginTop: "24px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
        {data.orgName} • Generated by BizzBills
      </div>
    </div>
  );
}

/* ===================================================================
   PREMIUM TEMPLATE
   =================================================================== */
function PremiumTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Premium header with large accent block */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", margin: "-40px -40px 32px", padding: "36px 40px", color: "white", borderRadius: "0 0 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: 0, letterSpacing: "-0.02em" }}>{data.orgName}</h1>
            {data.orgAddress && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: "4px 0 0" }}>{data.orgAddress}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", margin: "0 0 4px", fontWeight: 500 }}>Document</p>
            <p style={{ fontSize: "26px", fontWeight: "800", margin: 0, letterSpacing: "-0.02em", color: "#06b6d4" }}>{data.number}</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "32px", marginBottom: "32px" }}>
        <div>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerEmail && <p style={{ fontSize: "12px", color: "#64748b", margin: "0" }}>{data.customerEmail}</p>}
          {data.customerPhone && <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>{data.customerPhone}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "6px 0 0" }}>GSTIN: {data.customerGstin}</p>}
        </div>
        <div>
          <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px" }}>
            {[
              ["Invoice #", data.number] as const,
              ["Date", data.date] as const,
              ["Due Date", data.dueDate || "—"] as const,
              ...(data.poNumber ? [["PO Number", data.poNumber] as const] : []),
            ].map(([label, val]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px" }}>
                <span style={{ color: "#94a3b8" }}>{String(label)}</span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{String(val)}</span>
              </div>
            ))}
            {data.isPaid !== undefined && (
              <div style={{ marginTop: "8px", padding: "6px 10px", borderRadius: "6px", textAlign: "center", fontSize: "11px", fontWeight: 700, background: data.isPaid ? "#d1fae5" : "#fef3c7", color: data.isPaid ? "#065f46" : "#92400e" }}>
                {data.isPaid ? "✓ PAID" : "AWAITING PAYMENT"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #cbd5e1", borderRadius: "8px 0 0 0" }}>#</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #cbd5e1" }}>Description</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #cbd5e1" }}>Qty</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #cbd5e1" }}>Rate</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #cbd5e1" }}>GST</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #cbd5e1", borderRadius: "0 8px 0 0" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500 }}>
                {line.description}
                {line.hsnCode && <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "8px" }}>HSN: {line.hsnCode}</span>}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals + Payment Info side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Payment Details */}
        <div>
          {(data.bankName || data.upiId) && (
            <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>Payment Details</p>
              {data.bankName && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}><strong>Bank:</strong> {data.bankName}</p>}
              {data.bankAccount && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}><strong>A/C:</strong> {data.bankAccount}</p>}
              {data.bankIfsc && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}><strong>IFSC:</strong> {data.bankIfsc}</p>}
              {data.upiId && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}><strong>UPI:</strong> {data.upiId}</p>}
            </div>
          )}
        </div>

        {/* Totals */}
        <div>
          <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            {[
              ["Subtotal:", formatAmount(data.subtotal, cur)],
              ["GST:", formatAmount(data.taxTotal, cur)],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#64748b" }}>
                <span>{String(label)}</span><span style={{ color: "#475569", fontWeight: 500 }}>{String(val)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", marginTop: "4px", borderTop: "2px solid #0f172a", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              <span>Total</span><span style={{ color: "#06b6d4" }}>{formatAmount(data.total, cur)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Org Info Footer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "10px", color: "#94a3b8" }}>
        <div>
          {data.orgAddress && <p style={{ margin: "0 0 2px" }}>{data.orgAddress}</p>}
          {data.orgPhone && <p style={{ margin: "0" }}>📞 {data.orgPhone}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          {data.orgEmail && <p style={{ margin: "0 0 2px" }}>✉ {data.orgEmail}</p>}
          {data.orgGstin && <p style={{ margin: "0" }}>GSTIN: {data.orgGstin}</p>}
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginTop: "16px", padding: "12px 16px", background: "#fefce8", borderRadius: "8px", borderLeft: "3px solid #f59e0b", fontSize: "11px", color: "#713f12" }}>
          <strong>Note:</strong> {data.notes}
        </div>
      )}

      <div style={{ marginTop: "20px", fontSize: "9px", color: "#cbd5e1", textAlign: "center" }}>
        This is a computer-generated document • Generated by BizzBills • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Number to Words (Indian format)
   ─────────────────────────────────────────────── */
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const b = ["", "", "Twenty ", "Thirty ", "Forty ", "Fifty ", "Sixty ", "Seventy ", "Eighty ", "Ninety "];
  const units = ["", "Thousand ", "Lakh ", "Crore "];
  
  // Indian numbering: ones, tens/hundreds, thousand, lakh, crore
  const num = Math.round(n);
  if (num === 0) return "Zero";
  
  function convertBelow1000(x: number): string {
    let s = "";
    if (x >= 100) { s += a[Math.floor(x / 100)] + "Hundred "; x %= 100; }
    if (x >= 20) { s += b[Math.floor(x / 10)]; x %= 10; }
    if (x > 0) s += a[x];
    return s;
  }
  
  if (num < 1000) return convertBelow1000(num).trim();
  
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = num % 1000;
  
  let result = "";
  if (crores > 0) result += convertBelow1000(crores) + "Crore ";
  if (lakhs > 0) result += convertBelow1000(lakhs) + "Lakh ";
  if (thousands > 0) result += convertBelow1000(thousands) + "Thousand ";
  if (hundreds > 0) result += convertBelow1000(hundreds);
  
  return result.trim();
}

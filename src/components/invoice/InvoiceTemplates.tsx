"use client";

import type { ReactNode } from "react";
import { formatAmount } from "@/lib/currency";

/* ───────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────── */
export type TemplateId = "classic" | "modern" | "minimal" | "premium" | "mybillbook" | "best" | "corporate" | "gradient" | "blue" | "green" | "dark" | "compact";

export interface TemplateData {
  number: string;
  title: string;
  customerName: string;
  customerAddress?: string;
  customerGstin?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerState?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  poNumber?: string;
  referenceNumber?: string;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  lines: TemplateLine[];
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  taxTotal: number;
  shippingCharges?: number;
  adjustment?: number;
  roundOff?: number;
  total: number;
  currency?: string;
  notes?: string;
  terms?: string;
  // Shipping
  shippingName?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  // Organization
  orgName: string;
  orgAddress?: string;
  orgGstin?: string;
  orgEmail?: string;
  orgPhone?: string;
  orgLogo?: string;
  // Bank
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  // Signature
  signature?: string;
  signatureName?: string;
  signatureDesignation?: string;
  // Status
  isPaid?: boolean;
  paymentMethod?: string;
  // CGST/SGST breakup
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  cgstBreakup?: Record<number, number>;
  sgstBreakup?: Record<number, number>;
  igstBreakup?: Record<number, number>;
  isInterState?: boolean;
  // Amount in words
  amountInWords?: string;
  // Branding
  accentColor?: string;
  primaryColor?: string;
  fontFamily?: string;
  poweredByBizzBills?: boolean;
  watermark?: boolean;
  customFields?: string;
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
  {
    id: "mybillbook",
    name: "Super",
    description: "Popular billing app style — clean GST with QR code & UPI payment",
    preview: "📱",
    bestFor: "SMEs, retail shops, mobile-first billing",
  },
  {
    id: "best",
    name: "Best",
    description: "Tally-style professional layout with detailed tax columns, CGST/SGST breakup",
    preview: "⭐",
    bestFor: "Accountants, CA firms, Tally users migrating to cloud",
  },
  {
    id: "corporate",
    name: "Bold Corporate",
    description: "Strong professional branding with accent colors and structured sections",
    preview: "🏢",
    bestFor: "Corporates, agencies, consulting firms",
  },
  {
    id: "gradient",
    name: "Gradient Pro",
    description: "Modern gradient headers with vibrant color scheme and visual hierarchy",
    preview: "🌈",
    bestFor: "Creative agencies, designers, modern businesses",
  },
  {
    id: "blue",
    name: "Simple Blue",
    description: "Clean blue-themed professional layout — trusted by thousands",
    preview: "💙",
    bestFor: "General B2B, services, professional services",
  },
  {
    id: "green",
    name: "Green Pro",
    description: "Eco-friendly green theme with clear sections and payment highlights",
    preview: "💚",
    bestFor: "Eco brands, organic, health, wellness businesses",
  },
  {
    id: "dark",
    name: "Dark Mode",
    description: "Sleek dark theme for digital invoices and modern presentations",
    preview: "🌙",
    bestFor: "Tech companies, SaaS, digital products, night printing",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Space-efficient single-page layout for high-volume printing",
    preview: "📄",
    bestFor: "Retail, wholesale, high-volume billing, thermal printers",
  },
];

/* ── Accent color presets ── */
export const ACCENT_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#0d9488" },
  { name: "Slate", value: "#475569" },
  { name: "Dark", value: "#0f172a" },
];

/* ───────────────────────────────────────────────
   Template Selector Component
   ─────────────────────────────────────────────── */
export function TemplateSelector({
  selected,
  accentColor,
  onChange,
  onColorChange,
}: {
  selected: TemplateId;
  accentColor?: string;
  onChange: (id: TemplateId) => void;
  onColorChange?: (color: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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

      {/* Accent Color Picker */}
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
        <p className="mb-2 text-xs font-semibold text-slate-300">Accent Color</p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => {
            const active = (accentColor || "#06b6d4") === c.value;
            return (
              <button
                key={c.value}
                onClick={() => onColorChange?.(c.value)}
                title={c.name}
                className={`h-7 w-7 rounded-full border-2 transition-all duration-150 ${
                  active
                    ? "scale-110 border-white shadow-lg"
                    : "border-transparent hover:scale-105 hover:border-white/40"
                }`}
                style={{ background: c.value }}
              />
            );
          })}
          {/* Custom color input */}
          <label
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/20 text-[10px] text-slate-400 transition hover:border-white/40 hover:text-white"
            title="Custom color"
          >
            🎨
            <input
              type="color"
              value={accentColor || "#06b6d4"}
              onChange={(e) => onColorChange?.(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
      </div>
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
  let inner: ReactNode;
  switch (template) {
    case "classic": inner = <ClassicGSTTemplate data={data} />; break;
    case "modern": inner = <ModernCleanTemplate data={data} />; break;
    case "minimal": inner = <MinimalTemplate data={data} />; break;
    case "premium": inner = <PremiumTemplate data={data} />; break;
    case "mybillbook": inner = <MyBillBookTemplate data={data} />; break;
    case "best": inner = <BestTemplate data={data} />; break;
    case "corporate": inner = <CorporateTemplate data={data} />; break;
    case "gradient": inner = <GradientTemplate data={data} />; break;
    case "blue": inner = <BlueTemplate data={data} />; break;
    case "green": inner = <GreenTemplate data={data} />; break;
    case "dark": inner = <DarkTemplate data={data} />; break;
    case "compact": inner = <CompactTemplate data={data} />; break;
  }

  // Free-plan invoices carry the BizzAuto Ai logo watermark (platform branding)
  if (!data.watermark) return inner;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1 }}>{inner}</div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 2,
          overflow: "hidden",
        }}
      >
        <img
          src="/bizzauto-watermark.svg"
          alt="BizzAuto Ai"
          style={{
            width: "460px",
            maxWidth: "85%",
            opacity: 0.09,
            transform: "rotate(-24deg)",
          }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────── */
const currency = (d: TemplateData) => d.currency || "INR";
const lineTotal = (l: TemplateLine) => l.quantity * l.unitPrice * (1 + l.taxRate / 100);

/** Get accent color from data or fallback */
const accent = (d: TemplateData, fallback = "#06b6d4") => d.accentColor || fallback;

/** Get font family from data or fallback */
const fontFamily = (d: TemplateData, fallback = "'Inter', 'Segoe UI', Arial, sans-serif") =>
  d.fontFamily ? `'${d.fontFamily}', ${fallback}` : fallback;

/** Convert hex to rgb values */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Create a lighter shade (alpha background) from accent color */
function accentBg(d: TemplateData, fallback = "#06b6d4", alpha = 0.1): string {
  const [r, g, b] = hexToRgb(accent(d, fallback));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Create gradient from accent color */
function accentGradient(d: TemplateData, fallback = "#06b6d4"): string {
  const c = accent(d, fallback);
  const [r, g, b] = hexToRgb(c);
  const lighter = `rgb(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)})`;
  return `linear-gradient(135deg, ${c}, ${lighter})`;
}

/* ===================================================================
   CLASSIC GST TEMPLATE
   =================================================================== */
function ClassicGSTTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header with accent bar */}
      <div style={{ background: accentGradient(data), height: "6px", borderRadius: "3px 3px 0 0", margin: "-40px -40px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: "28px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{data.orgName}</h1>
          {data.orgAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{data.orgAddress}</p>}
          {data.orgGstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}><strong>GSTIN:</strong> {data.orgGstin}</p>}
          {data.orgEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgEmail}</p>}
          {data.orgPhone && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgPhone}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: accentGradient(data), color: "white", padding: "8px 20px", borderRadius: "6px", marginBottom: "8px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, opacity: 0.9 }}>{data.title}</p>
            <p style={{ fontSize: "16px", fontWeight: "700", margin: "2px 0 0", letterSpacing: "-0.01em" }}>{data.number}</p>
          </div>
          {data.poNumber && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>PO: {data.poNumber}</p>}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "2px solid #e2e8f0", margin: "20px 0" }} />

      {/* Bill To + Ship To + Dates */}
      <div style={{ display: "grid", gridTemplateColumns: data.shippingAddress ? "1fr 1fr 1fr" : "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px" }}>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", margin: "0 0 6px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: 0 }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.4 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: "#475569", margin: "4px 0 0" }}>GSTIN: {data.customerGstin}</p>}
          {data.customerPhone && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.customerPhone}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        {data.shippingAddress && (
          <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px" }}>
            <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", margin: "0 0 6px", fontWeight: 600 }}>Ship To</p>
            {data.shippingName && <p style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", margin: 0 }}>{data.shippingName}</p>}
            <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.4 }}>{data.shippingAddress}</p>
            {data.shippingPhone && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.shippingPhone}</p>}
          </div>
        )}
        <div style={{ textAlign: "right", paddingTop: "4px" }}>
          <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                ["Invoice Date:", data.date] as const,
                ["Due Date:", data.dueDate || "—"] as const,
                ...(data.poNumber ? [["PO No:", data.poNumber] as const] : []),
                ...(data.referenceNumber ? [["Ref No:", data.referenceNumber] as const] : []),
                ...(data.placeOfSupply ? [["Place of Supply:", data.placeOfSupply] as const] : []),
                ...(data.reverseCharge ? [["Reverse Charge:", "Yes"] as const] : []),
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
          <tr style={{ background: accentBg(data) }}>
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
        <div style={{ width: "320px" }}>
          {[
            ["Subtotal:", formatAmount(data.subtotal, cur)],
            ...(data.discountAmount ? [["Discount:", `-${formatAmount(data.discountAmount, cur)}`]] : []),
          ].map(([label, val], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span>
              <span style={{ color: "#475569", fontWeight: 500 }}>{val}</span>
            </div>
          ))}

          {/* CGST/SGST Breakup */}
          {data.isInterState ? (
            <div style={{ padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>IGST</span>
                <span style={{ color: "#475569", fontWeight: 500 }}>{formatAmount(data.igstTotal || data.taxTotal, cur)}</span>
              </div>
              {data.igstBreakup && Object.entries(data.igstBreakup).map(([rate, amt]) => (
                <div key={rate} style={{ display: "flex", justifyContent: "space-between", paddingLeft: "16px", fontSize: "10px", color: "#94a3b8" }}>
                  <span>@ {rate}%</span>
                  <span>{formatAmount(amt as number, cur)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              {(data.cgstBreakup ? Object.keys(data.cgstBreakup) : data.sgstBreakup ? Object.keys(data.sgstBreakup) : []).map((rate) => (
                <div key={rate} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>CGST @ {Number(rate) / 2}%</span>
                  <span style={{ color: "#475569", fontWeight: 500 }}>{formatAmount(data.cgstBreakup?.[Number(rate)] || 0, cur)}</span>
                </div>
              ))}
              {(data.sgstBreakup ? Object.keys(data.sgstBreakup) : data.cgstBreakup ? Object.keys(data.cgstBreakup) : []).map((rate) => (
                <div key={`sgst-${rate}`} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>SGST @ {Number(rate) / 2}%</span>
                  <span style={{ color: "#475569", fontWeight: 500 }}>{formatAmount(data.sgstBreakup?.[Number(rate)] || 0, cur)}</span>
                </div>
              ))}
            </div>
          )}

          {[
            ...(data.shippingCharges ? [["Shipping:", formatAmount(data.shippingCharges, cur)]] : []),
            ...(data.adjustment ? [["Adjustment:", `-₹${data.adjustment.toFixed(2)}`]] : []),
            ...(data.roundOff ? [["Round Off:", `₹${data.roundOff.toFixed(2)}`]] : []),
          ].map(([label, val], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span>
              <span style={{ color: "#475569", fontWeight: 500 }}>{val}</span>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: `2px solid ${accent(data)}`, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
            <span>Total</span>
            <span style={{ color: accent(data) }}>{formatAmount(data.total, cur)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "right", marginTop: "2px" }}>
            {data.isPaid ? "✓ Paid" : "Amount in " + cur}
          </div>
        </div>
      </div>

      {/* Amount in Words placeholder */}
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "16px", padding: "10px 14px", background: accentBg(data, "#06b6d4", 0.05), borderRadius: "6px", borderLeft: `3px solid ${accent(data)}` }}>
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
      {(data.signature || data.signatureName) && (
        <div style={{ marginTop: "24px", textAlign: "right", fontSize: "12px", color: "#475569" }}>
          <div style={{ marginBottom: "6px" }}>Authorized Signatory</div>
          {data.signature && <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: "18px", color: "#0f172a", marginBottom: "4px" }}>{data.signature}</div>}
          {data.signatureName && <div style={{ fontWeight: 600, color: "#0f172a" }}>{data.signatureName}</div>}
          {data.signatureDesignation && <div style={{ fontSize: "11px", color: "#94a3b8" }}>{data.signatureDesignation}</div>}
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
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "48px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          {data.orgLogo ? (
            <img src={data.orgLogo} alt="Logo" style={{ height: "48px", marginBottom: "8px" }} />
          ) : (
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: accentGradient(data), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
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
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${accent(data)}, ${accent(data)} 40%, #e2e8f0 40%)`, borderRadius: "2px", marginBottom: "32px" }} />

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
            <span>Total</span><span style={{ color: accent(data) }}>{formatAmount(data.total, cur)}</span>
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
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "36px", maxWidth: "800px", margin: "0 auto" }}>
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
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Premium header with large accent block */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", margin: "-40px -40px 32px", padding: "36px 40px", color: "white", borderRadius: "0 0 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: 0, letterSpacing: "-0.02em" }}>{data.orgName}</h1>
            {data.orgAddress && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: "4px 0 0" }}>{data.orgAddress}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", margin: "0 0 4px", fontWeight: 500 }}>Document</p>
            <p style={{ fontSize: "26px", fontWeight: "800", margin: 0, letterSpacing: "-0.02em", color: accent(data) }}>{data.number}</p>
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
              <span>Total</span><span style={{ color: accent(data) }}>{formatAmount(data.total, cur)}</span>
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

/* ===================================================================
   MYBILLBOOK STYLE TEMPLATE
   =================================================================== */
function MyBillBookTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "36px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Blue gradient header */}
      <div style={{ background: accentGradient(data, "#2563eb"), margin: "-36px -36px 28px", padding: "28px 36px", borderRadius: "0 0 20px 20px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: 0 }}>{data.orgName}</h1>
            {data.orgAddress && <p style={{ fontSize: "11px", margin: "4px 0 0", opacity: 0.8 }}>{data.orgAddress}</p>}
            {data.orgGstin && <p style={{ fontSize: "11px", margin: "2px 0 0", opacity: 0.8 }}>GSTIN: {data.orgGstin}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: "rgba(255,255,255,0.2)", padding: "8px 20px", borderRadius: "10px" }}>
              <p style={{ fontSize: "10px", margin: "0 0 2px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.1em" }}>{data.title}</p>
              <p style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>{data.number}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To + Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        <div style={{ background: "#f0f7ff", padding: "16px", borderRadius: "12px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 6px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: accent(data, "#2563eb"), margin: "4px 0 0", fontWeight: 500 }}>GSTIN: {data.customerGstin}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", display: "inline-block" }}>
            {[
              ["Invoice Date", data.date],
              ["Due Date", data.dueDate || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "3px 0", fontSize: "12px" }}>
                <span style={{ color: "#9ca3af" }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            {data.isPaid !== undefined && (
              <div style={{ marginTop: "8px", padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: data.isPaid ? "#dcfce7" : "#fef3c7", color: data.isPaid ? "#166534" : "#92400e", display: "inline-block" }}>
                {data.isPaid ? "✓ PAID" : "PENDING"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: accent(data, "#2563eb") }}>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>#</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Description</th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>HSN</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Qty</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Rate</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>GST</th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "white" : "#f9fafb" }}>
              <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#111827", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "10px 12px", color: "#6b7280", fontFamily: "monospace", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#4b5563" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#4b5563" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#4b5563" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ width: "280px" }}>
          {[
            ["Subtotal", formatAmount(data.subtotal, cur)],
            ["GST", formatAmount(data.taxTotal, cur)],
            ...(data.discount ? [["Discount", `-${formatAmount(data.discount, cur)}`]] : []),
            ...(data.shippingCharges ? [["Shipping", formatAmount(data.shippingCharges, cur)]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#6b7280" }}>
              <span>{label}</span><span style={{ fontWeight: 500, color: "#4b5563" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: `3px solid ${accent(data, "#2563eb")}`, fontSize: "16px", fontWeight: "700" }}>
            <span>Total</span><span style={{ color: accent(data, "#2563eb") }}>{formatAmount(data.total, cur)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af", textAlign: "right", marginTop: "2px" }}>
            {data.isPaid ? "✓ Payment Received" : "Amount in " + cur}
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "11px", color: "#4b5563", marginBottom: "16px", padding: "10px 14px", background: accentBg(data, "#2563eb", 0.06), borderRadius: "8px", borderLeft: `3px solid ${accent(data, "#2563eb")}` }}>
        <strong>In words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Bank Details + Notes */}
      <div style={{ display: "grid", gridTemplateColumns: data.bankName ? "1fr 1fr" : "1fr", gap: "16px", marginBottom: "16px" }}>
        {data.bankName && (
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", fontSize: "11px" }}>
            <p style={{ fontWeight: 600, margin: "0 0 6px", color: "#374151" }}>Bank Details</p>
            <div style={{ color: "#6b7280", lineHeight: 1.8 }}>
              <div><strong>Bank:</strong> {data.bankName}</div>
              <div><strong>A/C:</strong> {data.bankAccount}</div>
              <div><strong>IFSC:</strong> {data.bankIfsc}</div>
              {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
            </div>
          </div>
        )}
        {data.notes && (
          <div style={{ padding: "12px", background: "#fffbeb", borderRadius: "10px", fontSize: "11px", borderLeft: "3px solid #f59e0b" }}>
            <p style={{ fontWeight: 600, margin: "0 0 4px", color: "#92400e" }}>Notes</p>
            <p style={{ margin: 0, color: "#78350f", lineHeight: 1.5 }}>{data.notes}</p>
          </div>
        )}
      </div>

      {/* QR Code placeholder + UPI */}
      {data.upiId && (
        <div style={{ textAlign: "center", marginBottom: "16px", padding: "12px", background: "#f0f7ff", borderRadius: "10px" }}>
          <p style={{ fontSize: "10px", color: "#6b7280", margin: "0 0 4px" }}>Scan to Pay via UPI</p>
          <div style={{ width: "80px", height: "80px", margin: "0 auto", background: "white", borderRadius: "8px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#9ca3af" }}>QR Code</div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb", margin: "4px 0 0" }}>{data.upiId}</p>
        </div>
      )}

      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", fontSize: "9px", color: "#9ca3af", textAlign: "center" }}>
        {data.poweredByBizzBills !== false && <span>Powered by BizzBills • </span>}
        {data.orgName} • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

/* ===================================================================
   BEST TEMPLATE (Tally-style)
   =================================================================== */
function BestTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: data.fontFamily ? `'${data.fontFamily}', 'Courier New', monospace` : "'Courier New', 'Consolas', monospace", background: "white", color: "#1a1a1a", padding: "32px", maxWidth: "800px", margin: "0 auto", fontSize: "12px" }}>
      {/* Header with double line */}
      <div style={{ borderBottom: `3px double ${accent(data, "#1a1a1a")}`, paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: accent(data, "#1a1a1a"), margin: 0, fontFamily: "'Courier New', monospace" }}>{data.orgName}</h1>
            {data.orgAddress && <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0", lineHeight: 1.5 }}>{data.orgAddress}</p>}
            {data.orgGstin && <p style={{ fontSize: "11px", color: "#555", margin: "2px 0 0" }}>GSTIN/UIN: {data.orgGstin}</p>}
            {data.orgPhone && <p style={{ fontSize: "11px", color: "#555", margin: "2px 0 0" }}>Ph: {data.orgPhone}</p>}
            {data.orgEmail && <p style={{ fontSize: "11px", color: "#555", margin: "2px 0 0" }}>{data.orgEmail}</p>}
          </div>
          <div style={{ textAlign: "right", border: `2px solid ${accent(data, "#1a1a1a")}`, padding: "8px 16px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", margin: "0 0 2px", fontWeight: 700 }}>{data.title}</p>
            <p style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: accent(data) }}>{data.number}</p>
          </div>
        </div>
      </div>

      {/* Party & Date Details */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 0", fontWeight: 700, width: "120px" }}>Party Name</td>
            <td style={{ padding: "4px 0" }}>: {data.customerName}</td>
            <td style={{ padding: "4px 0", fontWeight: 700, width: "100px", textAlign: "right" }}>Date</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>: {data.date}</td>
          </tr>
          {data.customerGstin && (
            <tr>
              <td style={{ padding: "4px 0", fontWeight: 700 }}>GSTIN/UIN</td>
              <td style={{ padding: "4px 0" }}>: {data.customerGstin}</td>
              <td style={{ padding: "4px 0", fontWeight: 700, textAlign: "right" }}>Due Date</td>
              <td style={{ padding: "4px 0", textAlign: "right" }}>: {data.dueDate || "—"}</td>
            </tr>
          )}
          {data.customerAddress && (
            <tr>
              <td style={{ padding: "4px 0", fontWeight: 700 }}>Address</td>
              <td style={{ padding: "4px 0" }}>: {data.customerAddress}</td>
              {data.poNumber && <>
                <td style={{ padding: "4px 0", fontWeight: 700, textAlign: "right" }}>PO No.</td>
                <td style={{ padding: "4px 0", textAlign: "right" }}>: {data.poNumber}</td>
              </>}
            </tr>
          )}
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px", border: `1px solid ${accent(data, "#1a1a1a")}` }}>
        <thead>
          <tr style={{ background: accentBg(data, "#1a1a1a", 0.1) }}>
            {["Sl.", "Particulars", "HSN/SAC", "Qty", "Rate", "Per", "GST%", "Amount"].map((h) => (
              <th key={h} style={{ padding: "8px 6px", textAlign: h === "Particulars" ? "left" : "center", fontWeight: 700, fontSize: "10px", borderBottom: `2px solid ${accent(data, "#1a1a1a")}`, borderRight: "1px solid #ccc" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #ccc" }}>{i + 1}</td>
              <td style={{ padding: "8px 6px", borderRight: "1px solid #ccc", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #ccc", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #ccc" }}>{line.quantity}</td>
              <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #ccc" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #ccc" }}>Nos</td>
              <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #ccc" }}>{line.taxRate}%</td>
              <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
          {data.lines.length < 5 && Array.from({ length: 5 - data.lines.length }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ borderBottom: "1px solid #ddd", height: "28px" }}>
              {Array.from({ length: 8 }).map((_, j) => <td key={j} style={{ borderRight: j < 7 ? "1px solid #ccc" : "none" }}>&nbsp;</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ width: "48%", border: `1px solid ${accent(data, "#1a1a1a")}`, padding: "10px", fontSize: "11px" }}>
          <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Amount in Words</p>
          <p style={{ margin: 0, lineHeight: 1.5 }}>Rupees {numberToWords(data.total)} only</p>
        </div>
        <div style={{ width: "48%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${accent(data, "#1a1a1a")}`, fontSize: "11px" }}>
            <tbody>
              <tr><td style={{ padding: "6px 8px", fontWeight: 700, borderBottom: "1px solid #ddd" }}>Sub Total</td><td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #ddd" }}>{formatAmount(data.subtotal, cur)}</td></tr>
              <tr><td style={{ padding: "6px 8px", fontWeight: 700, borderBottom: "1px solid #ddd" }}>CGST</td><td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #ddd" }}>{formatAmount(data.taxTotal / 2, cur)}</td></tr>
              <tr><td style={{ padding: "6px 8px", fontWeight: 700, borderBottom: "1px solid #ddd" }}>SGST</td><td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #ddd" }}>{formatAmount(data.taxTotal / 2, cur)}</td></tr>
              <tr style={{ background: accentBg(data, "#1a1a1a", 0.1) }}><td style={{ padding: "8px", fontWeight: 700, fontSize: "13px" }}>GRAND TOTAL</td><td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: "13px", color: accent(data) }}>{formatAmount(data.total, cur)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Details */}
      {data.bankName && (
        <div style={{ border: `1px solid ${accent(data, "#1a1a1a")}`, padding: "10px", marginBottom: "16px", fontSize: "11px" }}>
          <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Bank Details</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            <div><strong>Bank:</strong> {data.bankName}</div>
            <div><strong>A/C No:</strong> {data.bankAccount}</div>
            <div><strong>IFSC:</strong> {data.bankIfsc}</div>
            {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
          </div>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div style={{ padding: "8px", background: accentBg(data, "#f9a825", 0.1), fontSize: "11px", marginBottom: "12px", borderLeft: `3px solid ${accent(data, "#f9a825")}` }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: `2px solid ${accent(data, "#1a1a1a")}`, fontSize: "11px" }}>
        <div>
          <p style={{ margin: "0 0 2px", color: "#555" }}>For {data.orgName}</p>
          <p style={{ marginTop: "30px", borderBottom: `1px solid ${accent(data, "#1a1a1a")}`, paddingBottom: "4px", width: "200px" }}>Authorised Signatory</p>
        </div>
        <div style={{ textAlign: "right", color: "#555", fontSize: "10px" }}>
          <p style={{ margin: 0 }}>Generated by BizzBills</p>
          <p style={{ margin: "2px 0 0" }}>{new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   BOLD CORPORATE TEMPLATE
   =================================================================== */
function CorporateTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Corporate header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          {data.orgLogo ? (
            <img src={data.orgLogo} alt="Logo" style={{ height: "52px", marginBottom: "8px" }} />
          ) : (
            <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "linear-gradient(135deg, #1e293b, #334155)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>
              {data.orgName.charAt(0)}
            </div>
          )}
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{data.orgName}</h1>
          {data.orgAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{data.orgAddress}</p>}
          {data.orgGstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>GSTIN: {data.orgGstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#1e293b", margin: 0, letterSpacing: "-0.03em", lineHeight: 1 }}>{data.title.toUpperCase()}</h2>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#6366f1", margin: "4px 0 0" }}>{data.number}</p>
          <div style={{ marginTop: "8px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            {data.isPaid !== undefined && (
              <span style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: data.isPaid ? "#dcfce7" : "#fef3c7", color: data.isPaid ? "#166534" : "#92400e" }}>
                {data.isPaid ? "✓ PAID" : "UNPAID"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accent line */}
      <div style={{ height: "4px", background: accentGradient(data, "#6366f1"), borderRadius: "2px", marginBottom: "24px" }} />

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", borderLeft: `4px solid ${accent(data, "#6366f1")}` }}>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", margin: "0 0 6px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: accent(data, "#6366f1"), margin: "4px 0 0", fontWeight: 500 }}>GSTIN: {data.customerGstin}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", borderRight: `4px solid ${accent(data, "#8b5cf6")}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                ["Invoice Date", data.date],
                ["Due Date", data.dueDate || "—"],
                ...(data.poNumber ? [["PO Number", data.poNumber]] : []),
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: "4px 12px 4px 0", color: "#94a3b8", textAlign: "left" }}>{label}</td>
                  <td style={{ padding: "4px 0", color: "#0f172a", fontWeight: 600, textAlign: "right" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "12px" }}>
        <thead>
          <tr>
            <th style={{ padding: "12px", textAlign: "left", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", borderRadius: "8px 0 0 0" }}>#</th>
            <th style={{ padding: "12px", textAlign: "left", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Description</th>
            <th style={{ padding: "12px", textAlign: "left", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>HSN</th>
            <th style={{ padding: "12px", textAlign: "right", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Qty</th>
            <th style={{ padding: "12px", textAlign: "right", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Rate</th>
            <th style={{ padding: "12px", textAlign: "right", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>GST</th>
            <th style={{ padding: "12px", textAlign: "right", background: accent(data, "#1e293b"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", borderRadius: "0 8px 0 0" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px", color: "#94a3b8" }}>{i + 1}</td>
              <td style={{ padding: "12px", color: "#0f172a", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "12px", color: "#64748b", fontFamily: "monospace", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "12px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "12px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "12px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "12px", textAlign: "right", color: "#0f172a", fontWeight: 700 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals + Payment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div>
          {data.bankName && (
            <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: accent(data, "#6366f1"), margin: "0 0 8px", fontWeight: 700 }}>Payment Details</p>
              <div style={{ fontSize: "11px", color: "#475569", lineHeight: 1.8 }}>
                <div><strong>Bank:</strong> {data.bankName}</div>
                <div><strong>A/C:</strong> {data.bankAccount}</div>
                <div><strong>IFSC:</strong> {data.bankIfsc}</div>
                {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          {[
            ["Subtotal", formatAmount(data.subtotal, cur)],
            ["GST", formatAmount(data.taxTotal, cur)],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span><span style={{ fontWeight: 500, color: "#475569" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: `3px solid ${accent(data, "#6366f1")}`, fontSize: "18px", fontWeight: "800" }}>
            <span>Total</span><span style={{ color: accent(data, "#6366f1") }}>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "11px", color: "#475569", padding: "10px 14px", background: accentBg(data, "#6366f1", 0.06), borderRadius: "8px", borderLeft: `3px solid ${accent(data, "#6366f1")}`, marginBottom: "16px" }}>
        <strong>Amount in Words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ padding: "12px", background: "#fffbeb", borderRadius: "8px", fontSize: "11px", color: "#92400e", borderLeft: "3px solid #f59e0b", marginBottom: "16px" }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b" }}>
        <div>
          <p style={{ margin: "0 0 2px" }}>For {data.orgName}</p>
          <div style={{ marginTop: "30px", width: "180px", borderTop: "1px solid #94a3b8", paddingTop: "4px" }}>Authorized Signature</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "9px", color: "#94a3b8" }}>
          <p style={{ margin: 0 }}>Generated by BizzBills</p>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   GRADIENT PRO TEMPLATE
   =================================================================== */
function GradientTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Gradient header */}
      <div style={{ background: accentGradient(data, "#ec4899"), margin: "-40px -40px 32px", padding: "36px 40px", borderRadius: "0 0 28px 28px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{data.orgName}</h1>
            {data.orgAddress && <p style={{ fontSize: "12px", margin: "4px 0 0", opacity: 0.9 }}>{data.orgAddress}</p>}
            {data.orgGstin && <p style={{ fontSize: "11px", margin: "2px 0 0", opacity: 0.8 }}>GSTIN: {data.orgGstin}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 4px", opacity: 0.8 }}>{data.title}</p>
            <p style={{ fontSize: "28px", fontWeight: "800", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{data.number}</p>
          </div>
        </div>
      </div>

      {/* Bill To + Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: accent(data, "#ec4899"), margin: "4px 0 0", fontWeight: 500 }}>GSTIN: {data.customerGstin}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "linear-gradient(135deg, #fdf2f8, #fae8ff)", padding: "14px", borderRadius: "12px" }}>
            {[
              ["Date", data.date],
              ["Due Date", data.dueDate || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "3px 0", fontSize: "12px" }}>
                <span style={{ color: "#9ca3af" }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "12px" }}>
        <thead>
          <tr>
            <th style={{ padding: "10px 12px", textAlign: "left", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", borderRadius: "10px 0 0 0" }}>#</th>
            <th style={{ padding: "10px 12px", textAlign: "left", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Description</th>
            <th style={{ padding: "10px 12px", textAlign: "left", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>HSN</th>
            <th style={{ padding: "10px 12px", textAlign: "right", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Qty</th>
            <th style={{ padding: "10px 12px", textAlign: "right", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Rate</th>
            <th style={{ padding: "10px 12px", textAlign: "right", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>GST</th>
            <th style={{ padding: "10px 12px", textAlign: "right", background: accentGradient(data, "#ec4899"), color: "white", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #fce7f3" }}>
              <td style={{ padding: "10px 12px", color: accent(data, "#c084fc") }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "monospace", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 700 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <div style={{ width: "280px" }}>
          {[
            ["Subtotal", formatAmount(data.subtotal, cur)],
            ["GST", formatAmount(data.taxTotal, cur)],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span><span style={{ fontWeight: 500, color: "#475569" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: "4px", borderTop: `3px solid ${accent(data, "#ec4899")}`, fontSize: "18px", fontWeight: "800" }}>
            <span>Total</span><span style={{ color: accent(data, "#ec4899") }}>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "11px", color: "#475569", padding: "10px 14px", background: accentBg(data, "#ec4899", 0.06), borderRadius: "8px", borderLeft: `3px solid ${accent(data, "#ec4899")}`, marginBottom: "16px" }}>
        <strong>In words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Bank + Notes */}
      <div style={{ display: "grid", gridTemplateColumns: data.bankName ? "1fr 1fr" : "1fr", gap: "16px", marginBottom: "16px" }}>
        {data.bankName && (
          <div style={{ padding: "14px", background: "#fdf2f8", borderRadius: "12px", fontSize: "11px" }}>
            <p style={{ fontWeight: 600, margin: "0 0 6px", color: "#9d174d" }}>Bank Details</p>
            <div style={{ color: "#6b7280", lineHeight: 1.8 }}>
              <div><strong>Bank:</strong> {data.bankName}</div>
              <div><strong>A/C:</strong> {data.bankAccount}</div>
              <div><strong>IFSC:</strong> {data.bankIfsc}</div>
              {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
            </div>
          </div>
        )}
        {data.notes && (
          <div style={{ padding: "12px", background: "#fffbeb", borderRadius: "10px", fontSize: "11px", borderLeft: "3px solid #f59e0b" }}>
            <p style={{ fontWeight: 600, margin: "0 0 4px", color: "#92400e" }}>Notes</p>
            <p style={{ margin: 0, color: "#78350f", lineHeight: 1.5 }}>{data.notes}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #fce7f3", fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
        Generated by BizzBills • {data.orgName} • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

/* ===================================================================
   SIMPLE BLUE TEMPLATE
   =================================================================== */
function BlueTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Blue header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: accent(data, "#1e40af"), margin: 0 }}>{data.orgName}</h1>
          {data.orgAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{data.orgAddress}</p>}
          {data.orgGstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>GSTIN: {data.orgGstin}</p>}
          {data.orgEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgEmail}</p>}
          {data.orgPhone && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgPhone}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: accent(data, "#1e40af"), color: "white", padding: "10px 24px", borderRadius: "8px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px", opacity: 0.8 }}>{data.title}</p>
            <p style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>{data.number}</p>
          </div>
        </div>
      </div>

      {/* Accent line */}
      <div style={{ height: "3px", background: accentGradient(data, "#1e40af"), borderRadius: "2px", marginBottom: "24px" }} />

      {/* Bill To + Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: accent(data, "#1e40af"), margin: "0 0 6px", fontWeight: 700 }}>Bill To</p>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: accent(data, "#1e40af"), margin: "4px 0 0" }}>GSTIN: {data.customerGstin}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                ["Invoice Date:", data.date],
                ["Due Date:", data.dueDate || "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: "3px 12px 3px 0", color: "#94a3b8", textAlign: "right" }}>{label}</td>
                  <td style={{ padding: "3px 0", color: "#0f172a", fontWeight: 600 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: accentBg(data, "#1e40af", 0.06) }}>
            {["#", "Description", "HSN", "Qty", "Rate", "GST", "Amount"].map((h) => (
              <th key={h} style={{ padding: "10px 12px", textAlign: h === "Description" ? "left" : "right", color: accent(data, "#1e40af"), fontWeight: 600, fontSize: "10px", textTransform: "uppercase", borderBottom: `2px solid ${accentBg(data, "#1e40af", 0.3)}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eff6ff" }}>
              <td style={{ padding: "10px 12px", color: "#93c5fd" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontFamily: "monospace", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 700 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ width: "260px" }}>
          {[
            ["Subtotal:", formatAmount(data.subtotal, cur)],
            ["GST:", formatAmount(data.taxTotal, cur)],
            ...(data.discount ? [["Discount:", `-${formatAmount(data.discount, cur)}`]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span><span style={{ fontWeight: 500, color: "#475569" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: `2px solid ${accent(data, "#1e40af")}`, fontSize: "16px", fontWeight: "700" }}>
            <span>Total</span><span style={{ color: accent(data, "#1e40af") }}>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "11px", color: "#475569", padding: "10px 14px", background: accentBg(data, "#1e40af", 0.06), borderRadius: "6px", borderLeft: `3px solid ${accent(data, "#1e40af")}`, marginBottom: "16px" }}>
        <strong>Amount in Words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Bank + Notes */}
      {data.bankName && (
        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "11px", color: "#64748b", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          <div><strong>Bank:</strong> {data.bankName}</div>
          <div><strong>A/C:</strong> {data.bankAccount}</div>
          <div><strong>IFSC:</strong> {data.bankIfsc}</div>
          {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
        </div>
      )}
      {data.notes && (
        <div style={{ padding: "10px", background: "#fffbeb", borderRadius: "6px", fontSize: "11px", color: "#92400e", borderLeft: "3px solid #f59e0b", marginBottom: "16px" }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b" }}>
        <div>
          <p style={{ margin: "0 0 2px" }}>For {data.orgName}</p>
          <div style={{ marginTop: "28px", width: "160px", borderTop: "1px solid #94a3b8", paddingTop: "4px" }}>Authorized Signature</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "9px", color: "#94a3b8" }}>
          Generated by BizzBills • {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   GREEN PRO TEMPLATE
   =================================================================== */
function GreenTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Green header */}
      <div style={{ background: accentGradient(data, "#059669"), margin: "-40px -40px 28px", padding: "32px 40px", borderRadius: "0 0 24px 24px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>{data.orgName}</h1>
            {data.orgAddress && <p style={{ fontSize: "11px", margin: "4px 0 0", opacity: 0.9 }}>{data.orgAddress}</p>}
            {data.orgGstin && <p style={{ fontSize: "11px", margin: "2px 0 0", opacity: 0.8 }}>GSTIN: {data.orgGstin}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px", opacity: 0.8 }}>{data.title}</p>
            <p style={{ fontSize: "24px", fontWeight: "800", margin: 0 }}>{data.number}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: accent(data, "#059669"), margin: "0 0 6px", fontWeight: 700 }}>Bill To</p>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: accent(data, "#059669"), margin: "4px 0 0" }}>GSTIN: {data.customerGstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "#ecfdf5", padding: "12px", borderRadius: "10px", display: "inline-block" }}>
            {[
              ["Date", data.date],
              ["Due", data.dueDate || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "3px 0", fontSize: "12px" }}>
                <span style={{ color: "#9ca3af" }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: accentBg(data, "#059669", 0.06) }}>
            {["#", "Description", "HSN", "Qty", "Rate", "GST", "Amount"].map((h) => (
              <th key={h} style={{ padding: "10px 12px", textAlign: h === "Description" ? "left" : "right", color: accent(data, "#065f46"), fontWeight: 600, fontSize: "10px", textTransform: "uppercase", borderBottom: `2px solid ${accentBg(data, "#059669", 0.2)}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ecfdf5" }}>
              <td style={{ padding: "10px 12px", color: accentBg(data, "#059669", 0.5) }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontFamily: "monospace", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 700 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ width: "260px" }}>
          {[
            ["Subtotal:", formatAmount(data.subtotal, cur)],
            ["GST:", formatAmount(data.taxTotal, cur)],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span><span style={{ fontWeight: 500, color: "#475569" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: `2px solid ${accent(data, "#059669")}`, fontSize: "16px", fontWeight: "700" }}>
            <span>Total</span><span style={{ color: accent(data, "#059669") }}>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "11px", color: "#475569", padding: "10px 14px", background: accentBg(data, "#059669", 0.06), borderRadius: "8px", borderLeft: `3px solid ${accent(data, "#059669")}`, marginBottom: "16px" }}>
        <strong>In words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Bank + Notes */}
      {data.bankName && (
        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "11px", color: "#64748b", marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          <div><strong>Bank:</strong> {data.bankName}</div>
          <div><strong>A/C:</strong> {data.bankAccount}</div>
          <div><strong>IFSC:</strong> {data.bankIfsc}</div>
          {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
        </div>
      )}
      {data.notes && (
        <div style={{ padding: "10px", background: "#fffbeb", borderRadius: "8px", fontSize: "11px", color: "#92400e", borderLeft: "3px solid #f59e0b", marginBottom: "16px" }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #d1fae5", fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
        Generated by BizzBills • {data.orgName} • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

/* ===================================================================
   DARK MODE TEMPLATE
   =================================================================== */
function DarkTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "#0f172a", color: "#e2e8f0", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Dark header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #1e293b" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#f1f5f9", margin: 0 }}>{data.orgName}</h1>
          {data.orgAddress && <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{data.orgAddress}</p>}
          {data.orgGstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>GSTIN: {data.orgGstin}</p>}
          {data.orgEmail && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>{data.orgEmail}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: accent(data, "#06b6d4"), margin: "0 0 4px", fontWeight: 600 }}>{data.title}</p>
          <p style={{ fontSize: "28px", fontWeight: "800", color: "#f1f5f9", margin: 0 }}>{data.number}</p>
          {data.isPaid !== undefined && (
            <span style={{ display: "inline-block", marginTop: "8px", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, background: data.isPaid ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: data.isPaid ? "#22c55e" : "#eab308" }}>
              {data.isPaid ? "✓ PAID" : "PENDING"}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: accent(data, "#06b6d4"), margin: "0 0 6px", fontWeight: 600 }}>Bill To</p>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "#f1f5f9", margin: "0 0 4px" }}>{data.customerName}</p>
          {data.customerAddress && <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 2px", lineHeight: 1.5 }}>{data.customerAddress}</p>}
          {data.customerGstin && <p style={{ fontSize: "11px", color: accent(data, "#06b6d4"), margin: "4px 0 0" }}>GSTIN: {data.customerGstin}</p>}
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>{data.customerEmail}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                ["Date:", data.date],
                ["Due:", data.dueDate || "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: "3px 12px 3px 0", color: "#64748b", textAlign: "right" }}>{label}</td>
                  <td style={{ padding: "3px 0", color: "#e2e8f0", fontWeight: 600 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#1e293b" }}>
            {["#", "Description", "HSN", "Qty", "Rate", "GST", "Amount"].map((h) => (
              <th key={h} style={{ padding: "10px 12px", textAlign: h === "Description" ? "left" : "right", color: accent(data, "#06b6d4"), fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "10px 12px", color: "#475569" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#e2e8f0", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace", fontSize: "10px" }}>{line.hsnCode || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#f1f5f9", fontWeight: 700 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <div style={{ width: "260px" }}>
          {[
            ["Subtotal:", formatAmount(data.subtotal, cur)],
            ["GST:", formatAmount(data.taxTotal, cur)],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#64748b" }}>
              <span>{label}</span><span style={{ fontWeight: 500, color: "#94a3b8" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "4px", borderTop: `2px solid ${accent(data, "#06b6d4")}`, fontSize: "16px", fontWeight: "700", color: "#f1f5f9" }}>
            <span>Total</span><span style={{ color: accent(data, "#06b6d4") }}>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "11px", color: "#94a3b8", padding: "10px 14px", background: "#1e293b", borderRadius: "8px", borderLeft: `3px solid ${accent(data, "#06b6d4")}`, marginBottom: "16px" }}>
        <strong>In words:</strong> Rupees {numberToWords(data.total)} only
      </div>

      {/* Bank + Notes */}
      {data.bankName && (
        <div style={{ padding: "12px", background: "#1e293b", borderRadius: "8px", fontSize: "11px", color: "#94a3b8", marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          <div><strong>Bank:</strong> {data.bankName}</div>
          <div><strong>A/C:</strong> {data.bankAccount}</div>
          <div><strong>IFSC:</strong> {data.bankIfsc}</div>
          {data.upiId && <div><strong>UPI:</strong> {data.upiId}</div>}
        </div>
      )}
      {data.notes && (
        <div style={{ padding: "10px", background: "rgba(234,179,8,0.1)", borderRadius: "8px", fontSize: "11px", color: "#eab308", borderLeft: "3px solid #eab308", marginBottom: "16px" }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #1e293b", fontSize: "9px", color: "#475569", textAlign: "center" }}>
        Generated by BizzBills • {data.orgName} • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

/* ===================================================================
   COMPACT TEMPLATE
   =================================================================== */
function CompactTemplate({ data }: { data: TemplateData }) {
  const cur = currency(data);
  return (
    <div className="invoice-template" style={{ fontFamily: fontFamily(data), background: "white", color: "#1e293b", padding: "24px", maxWidth: "800px", margin: "0 auto", fontSize: "11px" }}>
      {/* Compact header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: `2px solid ${accent(data, "#0f172a")}`, marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: accent(data, "#0f172a"), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px", fontWeight: 800 }}>
            {data.orgName.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>{data.orgName}</h1>
            <p style={{ fontSize: "9px", color: "#94a3b8", margin: "1px 0 0" }}>{data.orgGstin ? `GSTIN: ${data.orgGstin}` : data.orgAddress || ""}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 1px" }}>{data.title}</p>
          <p style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", margin: 0 }}>{data.number}</p>
        </div>
      </div>

      {/* Bill To + Dates - single line */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "10px" }}>
        <div>
          <span style={{ color: "#94a3b8" }}>To: </span>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{data.customerName}</span>
          {data.customerGstin && <span style={{ color: "#64748b", marginLeft: "8px" }}>GSTIN: {data.customerGstin}</span>}
        </div>
        <div style={{ color: "#64748b" }}>
          {data.date}{data.dueDate ? ` | Due: ${data.dueDate}` : ""}
        </div>
      </div>

      {/* Items Table - ultra compact */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "10px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #0f172a" }}>
            <th style={{ padding: "4px 4px", textAlign: "left", fontWeight: 700, fontSize: "8px", textTransform: "uppercase" }}>Item</th>
            <th style={{ padding: "4px 4px", textAlign: "right", fontWeight: 700, fontSize: "8px", textTransform: "uppercase" }}>Qty</th>
            <th style={{ padding: "4px 4px", textAlign: "right", fontWeight: 700, fontSize: "8px", textTransform: "uppercase" }}>Rate</th>
            <th style={{ padding: "4px 4px", textAlign: "right", fontWeight: 700, fontSize: "8px", textTransform: "uppercase" }}>GST%</th>
            <th style={{ padding: "4px 4px", textAlign: "right", fontWeight: 700, fontSize: "8px", textTransform: "uppercase" }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "5px 4px", color: "#0f172a" }}>{line.description}</td>
              <td style={{ padding: "5px 4px", textAlign: "right", color: "#475569" }}>{line.quantity}</td>
              <td style={{ padding: "5px 4px", textAlign: "right", color: "#475569" }}>{formatAmount(line.unitPrice, cur)}</td>
              <td style={{ padding: "5px 4px", textAlign: "right", color: "#94a3b8" }}>{line.taxRate}%</td>
              <td style={{ padding: "5px 4px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{formatAmount(lineTotal(line), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals - compact right-aligned */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", color: "#94a3b8" }}>
          {data.orgPhone && <span>{data.orgPhone}</span>}
          {data.orgEmail && <span> | {data.orgEmail}</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "10px", color: "#64748b" }}>
            <span>Sub:</span><span>{formatAmount(data.subtotal, cur)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "10px", color: "#64748b" }}>
            <span>GST:</span><span>{formatAmount(data.taxTotal, cur)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "2px", paddingTop: "2px", borderTop: "1px solid #0f172a", fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
            <span>Total:</span><span>{formatAmount(data.total, cur)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ fontSize: "9px", color: "#64748b", padding: "4px 8px", background: "#f8fafc", borderRadius: "4px", marginBottom: "8px" }}>
        <strong>Words:</strong> Rs. {numberToWords(data.total)} only
      </div>

      {/* Bank + Notes in one line */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8", paddingTop: "6px", borderTop: "1px solid #e2e8f0" }}>
        <div>
          {data.bankName && <span>Bank: {data.bankName} | A/C: {data.bankAccount} | IFSC: {data.bankIfsc}</span>}
        </div>
        <div>
          {data.upiId && <span>UPI: {data.upiId}</span>}
          <span style={{ marginLeft: "8px" }}>BizzBills</span>
        </div>
      </div>
    </div>
  );
}

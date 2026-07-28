"use client";

import { formatAmount } from "@/lib/currency";

type LineItem = { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string };
type DocumentData = {
  number: string;
  title: string;
  customerName: string;
  customerGstin?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  lines: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency?: string;
  notes?: string;
  orgName?: string;
  orgAddress?: string;
  orgGstin?: string;
};

export function PrintableDocument({ data }: { data: DocumentData }) {
  const currency = data.currency || "INR";
  return (
    <div className="print-only" style={{ display: "none", fontFamily: "Arial, sans-serif", padding: "40px", color: "#1a1a1a", background: "white" }}>
      <style>{`
        @media print {
          .print-only { display: block !important; }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px", borderBottom: "2px solid #06b6d4", paddingBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>{data.orgName || "BizzBills"}</h1>
          {data.orgAddress && <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{data.orgAddress}</p>}
          {data.orgGstin && <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>GSTIN: {data.orgGstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#06b6d4", margin: 0 }}>{data.title}</h2>
          <p style={{ fontSize: "14px", color: "#475569", marginTop: "4px" }}>{data.number}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 4px" }}>Bill To</h3>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: 0 }}>{data.customerName}</p>
          {data.customerGstin && <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>GSTIN: {data.customerGstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0" }}>Date: <strong style={{ color: "#0f172a" }}>{data.date}</strong></p>
          {data.dueDate && <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>Due: <strong style={{ color: "#0f172a" }}>{data.dueDate}</strong></p>}
          {data.validUntil && <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>Valid Until: <strong style={{ color: "#0f172a" }}>{data.validUntil}</strong></p>}
        </div>
      </div>

      {/* Line Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>#</th>
            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Description</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Qty</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Rate</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Tax</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 12px", fontSize: "12px", color: "#64748b" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#0f172a" }}>{line.description}{line.hsnCode ? ` (HSN: ${line.hsnCode})` : ""}</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#475569", textAlign: "right" }}>{line.quantity}</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#475569", textAlign: "right" }}>{formatAmount(line.unitPrice, currency)}</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#475569", textAlign: "right" }}>{line.taxRate}%</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#0f172a", textAlign: "right", fontWeight: "600" }}>{formatAmount(line.quantity * line.unitPrice * (1 + line.taxRate / 100), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "260px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#64748b" }}>
            <span>Subtotal</span><span style={{ color: "#0f172a" }}>{formatAmount(data.subtotal, currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#64748b" }}>
            <span>Tax</span><span style={{ color: "#0f172a" }}>{formatAmount(data.taxTotal, currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "16px", fontWeight: "bold", color: "#0f172a", borderTop: "2px solid #0f172a", marginTop: "4px" }}>
            <span>Total</span><span style={{ color: "#06b6d4" }}>{formatAmount(data.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginTop: "24px", padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12px", color: "#64748b" }}>
          <strong style={{ color: "#475569" }}>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "10px", color: "#94a3b8", textAlign: "center" }}>
        Generated by BizzBills • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

export function handlePrint() {
  // Show the print-only section
  const el = document.querySelector(".print-only") as HTMLElement;
  if (el) el.style.display = "block";
  window.print();
  setTimeout(() => { if (el) el.style.display = "none"; }, 1000);
}
"use client";

import { type TemplateId, type TemplateData } from "@/components/invoice/InvoiceTemplates";
import dynamic from "next/dynamic";

// Lazy-load template components only when printing
const InvoiceTemplate = dynamic(
  () => import("@/components/invoice/InvoiceTemplates").then((m) => ({ default: m.InvoiceTemplate })),
  { ssr: false }
);

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
  orgEmail?: string;
  orgPhone?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  upiId?: string;
  accentColor?: string;
  // Branding fields (Phase 17)
  primaryColor?: string;
  fontFamily?: string;
  poweredByBizzBills?: boolean;
  customFields?: string;
};

function toTemplateData(data: DocumentData): TemplateData {
  return {
    number: data.number,
    title: data.title,
    customerName: data.customerName,
    customerGstin: data.customerGstin,
    date: data.date,
    dueDate: data.dueDate,
    validUntil: data.validUntil,
    lines: data.lines.map((l) => ({
      description: l.description,
      hsnCode: l.hsnCode,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
    subtotal: data.subtotal,
    taxTotal: data.taxTotal,
    total: data.total,
    currency: data.currency || "INR",
    notes: data.notes,
    orgName: data.orgName || "BizzBills",
    orgAddress: data.orgAddress,
    orgGstin: data.orgGstin,
    orgEmail: data.orgEmail,
    orgPhone: data.orgPhone,
    bankName: data.bankName,
    bankAccount: data.bankAccount,
    bankIfsc: data.bankIfsc,
    upiId: data.upiId,
    accentColor: data.accentColor,
    terms: "Thank you for your business.",
    // Branding fields (Phase 17)
    primaryColor: data.primaryColor,
    fontFamily: data.fontFamily,
    poweredByBizzBills: data.poweredByBizzBills,
    customFields: data.customFields,
  };
}

export function PrintableDocument({
  data,
  templateId = "classic",
}: {
  data: DocumentData;
  templateId?: TemplateId;
}) {
  const templateData = toTemplateData(data);
  return (
    <div className="print-only" style={{ display: "none" }}>
      <style>{`
        @media print {
          .print-only { display: block !important; }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
      <InvoiceTemplate template={templateId} data={templateData} />
    </div>
  );
}

/**
 * Client-side print handler. Call from any invoice detail page.
 */
export function handlePrint() {
  const el = document.querySelector(".print-only") as HTMLElement | null;
  if (el) el.style.removeProperty("display");
  window.print();
  setTimeout(() => {
    if (el) el.style.display = "none";
  }, 1000);
}

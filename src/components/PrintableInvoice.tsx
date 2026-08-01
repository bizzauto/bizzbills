"use client";

import { type TemplateId, type TemplateData } from "@/components/invoice/InvoiceTemplates";
import dynamic from "next/dynamic";

// Lazy-load template components only when printing
const InvoiceTemplate = dynamic(
  () => import("@/components/invoice/InvoiceTemplates").then((m) => ({ default: m.InvoiceTemplate })),
  { ssr: false }
);

type LineItem = { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string; discount?: number };
type DocumentData = {
  number: string;
  title: string;
  customerName: string;
  customerGstin?: string;
  customerAddress?: string;
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
  lines: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  discountAmount?: number;
  shippingCharges?: number;
  adjustment?: number;
  roundOff?: number;
  amountInWords?: string;
  currency?: string;
  notes?: string;
  terms?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  orgName?: string;
  orgAddress?: string;
  orgGstin?: string;
  orgEmail?: string;
  orgPhone?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  signature?: string;
  signatureName?: string;
  signatureDesignation?: string;
  accentColor?: string;
  primaryColor?: string;
  fontFamily?: string;
  poweredByBizzBills?: boolean;
  customFields?: string;
  // CGST/SGST breakup
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  cgstBreakup?: Record<number, number>;
  sgstBreakup?: Record<number, number>;
  igstBreakup?: Record<number, number>;
  isInterState?: boolean;
};

function toTemplateData(data: DocumentData): TemplateData {
  // Calculate CGST/SGST breakup
  const isInterState = data.customerState && data.placeOfSupply && data.customerState !== data.placeOfSupply;
  const cgstBreakup: Record<number, number> = {};
  const sgstBreakup: Record<number, number> = {};
  const igstBreakup: Record<number, number> = {};

  data.lines.forEach((line) => {
    const lineTotal = line.quantity * line.unitPrice;
    const lineDiscount = lineTotal * ((line.discount || 0) / 100);
    const taxableAmount = lineTotal - lineDiscount;
    const taxAmount = taxableAmount * (line.taxRate / 100);

    if (isInterState) {
      igstBreakup[line.taxRate] = (igstBreakup[line.taxRate] || 0) + taxAmount;
    } else {
      const halfTax = taxAmount / 2;
      cgstBreakup[line.taxRate] = (cgstBreakup[line.taxRate] || 0) + halfTax;
      sgstBreakup[line.taxRate] = (sgstBreakup[line.taxRate] || 0) + halfTax;
    }
  });

  return {
    number: data.number,
    title: data.title,
    customerName: data.customerName,
    customerGstin: data.customerGstin,
    customerAddress: data.customerAddress,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    customerState: data.customerState,
    date: data.date,
    dueDate: data.dueDate,
    validUntil: data.validUntil,
    poNumber: data.poNumber,
    referenceNumber: data.referenceNumber,
    placeOfSupply: data.placeOfSupply,
    reverseCharge: data.reverseCharge,
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
    discountAmount: data.discountAmount,
    shippingCharges: data.shippingCharges,
    adjustment: data.adjustment,
    roundOff: data.roundOff,
    amountInWords: data.amountInWords,
    currency: data.currency || "INR",
    notes: data.notes,
    terms: data.terms,
    shippingName: data.shippingName,
    shippingAddress: data.shippingAddress,
    shippingPhone: data.shippingPhone,
    orgName: data.orgName || "BizzBills",
    orgAddress: data.orgAddress,
    orgGstin: data.orgGstin,
    orgEmail: data.orgEmail,
    orgPhone: data.orgPhone,
    bankName: data.bankName,
    bankAccount: data.bankAccount,
    bankAccountName: data.bankAccountName,
    bankIfsc: data.bankIfsc,
    bankBranch: data.bankBranch,
    upiId: data.upiId,
    signature: data.signature,
    signatureName: data.signatureName,
    signatureDesignation: data.signatureDesignation,
    accentColor: data.accentColor,
    primaryColor: data.primaryColor,
    fontFamily: data.fontFamily,
    poweredByBizzBills: data.poweredByBizzBills,
    customFields: data.customFields,
    // CGST/SGST breakup
    cgstTotal: Object.values(cgstBreakup).reduce((a, b) => a + b, 0),
    sgstTotal: Object.values(sgstBreakup).reduce((a, b) => a + b, 0),
    igstTotal: Object.values(igstBreakup).reduce((a, b) => a + b, 0),
    cgstBreakup: Object.keys(cgstBreakup).length > 0 ? cgstBreakup : undefined,
    sgstBreakup: Object.keys(sgstBreakup).length > 0 ? sgstBreakup : undefined,
    igstBreakup: Object.keys(igstBreakup).length > 0 ? igstBreakup : undefined,
    isInterState,
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

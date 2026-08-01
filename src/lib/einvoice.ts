import crypto from "crypto";

export interface EInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string;
  totalValue: number;
  supplierGstin: string;
  buyerGstin: string;
}

export interface EInvoiceResult {
  irn: string;
  qrData: string;
  irnDate: string;
}

/**
 * Generate IRN (Invoice Reference Number).
 * In production this calls the GST E-Invoice API at
 * https://api.einvoice1.gov.in/generateIRN
 * For now, we produce a deterministic SHA-256 hash.
 */
export function generateIRN(invoice: EInvoiceInput): string {
  const data = `${invoice.invoiceNumber}:${invoice.invoiceDate}:${invoice.totalValue}:${invoice.supplierGstin}:${invoice.buyerGstin}`;
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex")
    .substring(0, 64)
    .toUpperCase();
}

/**
 * Generate QR code payload as per GST e-invoice spec v1.1.
 * In production the QR code is signed by the IRP and returned
 * alongside the IRN. Here we build the unsigned JSON payload.
 */
export function generateEInvoiceQRData(invoice: {
  irn: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalValue: number;
  supplierGstin: string;
  buyerGstin: string;
}): string {
  return JSON.stringify({
    version: "1.1",
    irn: invoice.irn,
    txn: invoice.invoiceNumber,
    dt: invoice.invoiceDate,
    ttlval: invoice.totalValue.toString(),
    sgstin: invoice.supplierGstin,
    bgstin: invoice.buyerGstin,
  });
}

/**
 * Validate GSTIN format.
 * GSTIN = 2-digit state code + 10-char PAN + 1 entity number + Z + 1 check digit
 * Regex: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
 */
export function isValidGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gstin,
  );
}

/**
 * Parse a GSTIN into its component parts.
 */
export function parseGSTIN(gstin: string) {
  return {
    stateCode: gstin.substring(0, 2),
    pan: gstin.substring(2, 12),
    entityNumber: gstin.substring(12, 13),
    checksum: gstin.substring(14),
  };
}

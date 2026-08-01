import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";
import {
  generateIRN,
  generateEInvoiceQRData,
  isValidGSTIN,
  type EInvoiceResult,
} from "@/lib/einvoice";

/**
 * POST /api/invoices/:id/e-invoice
 *
 * Generates an E-Invoice for a given invoice:
 * 1. Fetch the invoice from DB (with auth + org check)
 * 2. Validate supplier GSTIN (from org) and buyer GSTIN (on invoice)
 * 3. Generate IRN using deterministic SHA-256 hash
 * 4. Build QR code data payload
 * 5. Store IRN on the invoice (via ewayBillId field) and return result
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getSessionOrgId(session.user.id);

  // Fetch the invoice with org ownership check
  const where: { id: string; userId?: string; orgId?: string } = { id };
  if (orgId) {
    where.orgId = orgId;
  } else {
    where.userId = session.user.id;
  }

  const invoice = await prisma.invoice.findFirst({
    where,
    include: { lines: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Fetch the organization to get the supplier GSTIN
  let supplierGstin = "";
  if (invoice.orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: invoice.orgId },
      select: { gstin: true },
    });
    supplierGstin = org?.gstin ?? "";
  }

  // Validate GSTINs
  const supplierValid = isValidGSTIN(supplierGstin);
  const buyerValid = isValidGSTIN(invoice.customerGstin);

  if (!supplierValid) {
    return NextResponse.json(
      {
        error: "Invalid supplier GSTIN. Configure your organization GSTIN in Settings.",
        supplierGstinValid: false,
        buyerGstinValid: buyerValid,
      },
      { status: 400 },
    );
  }

  if (!buyerValid) {
    return NextResponse.json(
      {
        error: "Invalid buyer GSTIN on this invoice.",
        supplierGstinValid: true,
        buyerGstinValid: false,
      },
      { status: 400 },
    );
  }

  // Build the invoice date string (DD-MM-YYYY as per GST spec)
  const createdAt = new Date(invoice.createdAt);
  const invoiceDate = [
    String(createdAt.getDate()).padStart(2, "0"),
    String(createdAt.getMonth() + 1).padStart(2, "0"),
    createdAt.getFullYear(),
  ].join("-");

  // Generate IRN
  const irn = generateIRN({
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate,
    totalValue: invoice.total,
    supplierGstin,
    buyerGstin: invoice.customerGstin,
  });

  // Generate QR code data
  const qrData = generateEInvoiceQRData({
    irn,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate,
    totalValue: invoice.total,
    supplierGstin,
    buyerGstin: invoice.customerGstin,
  });

  const irnDate = new Date().toISOString();

  // Store IRN on the invoice using the ewayBillId field
  await prisma.invoice.update({
    where: { id },
    data: { ewayBillId: irn },
  });

  const result: EInvoiceResult = { irn, qrData, irnDate };

  return NextResponse.json(result);
}

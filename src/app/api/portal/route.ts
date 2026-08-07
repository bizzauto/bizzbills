import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

const PORTAL_SECRET = process.env.PORTAL_SECRET;
if (!PORTAL_SECRET) {
  console.warn("⚠️ PORTAL_SECRET is not set — portal tokens will be rejected");
}

/**
 * Generate a portal token for a customer+org combination.
 * Token is base64url-encoded JSON with HMAC signature for integrity.
 */
function generatePortalToken(
  customerName: string,
  orgId: string
): string {
  if (!PORTAL_SECRET) throw new Error("PORTAL_SECRET not configured");
  const payload = JSON.stringify({ c: customerName, o: orgId });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", PORTAL_SECRET)
    .update(encoded)
    .digest("base64url")
    .slice(0, 32);
  return `${encoded}.${sig}`;
}

/**
 * Decode and verify a portal token.
 * Returns customerName and orgId if valid, null otherwise.
 */
function decodePortalToken(
  token: string
): { customerName: string; orgId: string } | null {
  if (!PORTAL_SECRET) return null;
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const expectedSig = crypto
      .createHmac("sha256", PORTAL_SECRET)
      .update(encoded)
      .digest("base64url")
      .slice(0, 32);

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (!payload.c || !payload.o) return null;

    return { customerName: payload.c, orgId: payload.o };
  } catch {
    return null;
  }
}

/**
 * GET /api/portal?token=xxx
 *
 * Public portal endpoint. No session auth required.
 * Accepts a portal token and returns invoices, payments, and org info
 * for the encoded customer.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Portal token is required" },
        { status: 400 }
      );
    }

    const decoded = decodePortalToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired portal token" },
        { status: 401 }
      );
    }

    const { customerName, orgId } = decoded;

    // Fetch org info
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        logo: true,
        currency: true,
        gstin: true,
        address: true,
        phone: true,
        email: true,
        website: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch invoices for this customer in this org
    const invoices = await prisma.invoice.findMany({
      where: {
        orgId,
        customerName,
      },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        customerGstin: true,
        currency: true,
        status: true,
        subtotal: true,
        taxTotal: true,
        total: true,
        dueDate: true,
        createdAt: true,
        lines: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            taxRate: true,
            hsnCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch payments for invoices of this customer in this org
    const payments = await prisma.payment.findMany({
      where: {
        orgId,
        invoice: {
          customerName,
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        gatewayRef: true,
        upiTransactionId: true,
        notes: true,
        paidAt: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      org,
      customer: { name: customerName },
      invoices,
      payments,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load portal data: ${message}` },
      { status: 500 }
    );
  }
}

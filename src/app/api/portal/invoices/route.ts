import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/portal/invoices?customer=xxx&orgId=xxx
 *
 * Requires session auth. Returns invoices for a customer within an org.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customer = searchParams.get("customer");
    const orgId = searchParams.get("orgId");

    if (!customer || !orgId) {
      return NextResponse.json(
        { error: "Both 'customer' and 'orgId' query parameters are required" },
        { status: 400 }
      );
    }

    // Verify the org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch invoices for this customer within this org
    const invoices = await prisma.invoice.findMany({
      where: {
        orgId,
        customerName: customer,
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

    return NextResponse.json({
      org,
      customer: { name: customer },
      invoices,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch invoices: ${message}` },
      { status: 500 }
    );
  }
}

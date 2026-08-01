import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

/**
 * WhatsApp Share API
 * Generates a WhatsApp share link with pre-filled invoice details.
 * Uses the WhatsApp API: https://wa.me/<phone>?text=<encoded message>
 */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      invoiceId?: string;
      phone?: string;
      message?: string;
    };

    if (!body.invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: body.invoiceId, orgId },
      include: { lines: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, phone: true, gstin: true },
    });

    // Build WhatsApp message
    const message =
      body.message ||
      [
        `📋 *Invoice #${invoice.invoiceNumber}*`,
        ``,
        `From: *${org?.name ?? "Business"}*`,
        `To: ${invoice.customerName}`,
        `Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`,
        `Due: ${invoice.dueDate}`,
        ``,
        `*Amount: ${formatCurrency(invoice.total)}*`,
        `Status: ${invoice.status}`,
        ``,
        invoice.lines
          .map(
            (l) =>
              `• ${l.description} × ${l.quantity} @ ${formatCurrency(l.unitPrice)}`
          )
          .join("\n"),
        ``,
        invoice.taxTotal > 0
          ? `Tax: ${formatCurrency(invoice.taxTotal)}`
          : null,
        `Total: *${formatCurrency(invoice.total)}*`,
        ``,
        `Thank you for your business! 🙏`,
      ]
        .filter(Boolean)
        .join("\n");

    // Clean phone number (remove spaces, dashes, +)
    const cleanPhone = (body.phone ?? invoice.customerGstin ?? "").replace(
      /[^0-9]/g,
      ""
    );

    // Generate WhatsApp share URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    // Also generate a shareable text version
    const shareText = message;

    return NextResponse.json({
      url: whatsappUrl,
      message: shareText,
      phone: cleanPhone || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";
import { NextResponse } from "next/server";
import { sendEmail, generateInvoiceEmailHtml } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const orgId = await getSessionOrgId(session.user.id);

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

  let recipientEmail: string;
  try {
    const body = (await request.json()) as { email?: string };
    recipientEmail = body.email?.trim() ?? "";
  } catch {
    recipientEmail = "";
  }

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json(
      { error: "A valid recipient email address is required" },
      { status: 400 },
    );
  }

  let orgName = "Your Business";
  let orgEmail: string | undefined;
  let orgPhone: string | undefined;

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, email: true, phone: true },
    });
    if (org) {
      orgName = org.name;
      orgEmail = org.email ?? undefined;
      orgPhone = org.phone ?? undefined;
    }
  }

  const html = generateInvoiceEmailHtml(
    {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate || undefined,
      orgName,
      orgEmail,
      orgPhone,
    },
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invoices/${invoice.id}`,
  );

  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Invoice #${invoice.invoiceNumber} from ${orgName}`,
      html,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: recipientEmail,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

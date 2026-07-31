import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

type SeverityBucket = "gentle" | "firm" | "urgent" | "final";

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  outstanding: number;
  dueDate: string;
  daysOverdue: number;
  severity: SeverityBucket;
  status: string;
}

function classifySeverity(days: number): SeverityBucket {
  if (days <= 7) return "gentle";
  if (days <= 30) return "firm";
  if (days <= 60) return "urgent";
  return "final";
}

function severityLabel(severity: SeverityBucket): string {
  const labels: Record<SeverityBucket, string> = {
    gentle: "Gentle (1-7 days)",
    firm: "Firm (8-30 days)",
    urgent: "Urgent (31-60 days)",
    final: "Final Notice (60+ days)",
  };
  return labels[severity];
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { in: ["sent", "overdue"] },
    },
    include: {
      payments: {
        where: { status: "completed" },
        select: { amount: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const overdueInvoices: OverdueInvoice[] = invoices
    .filter((inv) => {
      const dueDate = new Date(inv.dueDate);
      return dueDate < today;
    })
    .map((inv) => {
      const dueDate = new Date(inv.dueDate);
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const collected = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = +(inv.total - collected).toFixed(2);

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        total: inv.total,
        outstanding,
        dueDate: inv.dueDate,
        daysOverdue,
        severity: classifySeverity(daysOverdue),
        status: inv.status,
      };
    })
    .filter((inv) => inv.outstanding > 0);

  const countBySeverity = {
    gentle: 0,
    firm: 0,
    urgent: 0,
    final: 0,
  };

  for (const inv of overdueInvoices) {
    countBySeverity[inv.severity] += 1;
  }

  const totalOverdue = overdueInvoices.reduce(
    (sum, inv) => sum + inv.outstanding,
    0
  );

  return NextResponse.json({
    invoices: overdueInvoices,
    summary: {
      totalOverdue: +totalOverdue.toFixed(2),
      countBySeverity,
    },
  });
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
      reminderType?: SeverityBucket;
    };

    if (!body.invoiceId || !body.reminderType) {
      return NextResponse.json(
        { error: "invoiceId and reminderType are required" },
        { status: 400 }
      );
    }

    const validTypes: SeverityBucket[] = ["gentle", "firm", "urgent", "final"];
    if (!validTypes.includes(body.reminderType)) {
      return NextResponse.json(
        { error: "Invalid reminderType. Must be: gentle, firm, urgent, or final" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: body.invoiceId, orgId },
      select: { id: true, invoiceNumber: true, customerName: true, status: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    console.log(
      `[DUNNING] Reminder sent — Invoice: #${invoice.invoiceNumber}, Customer: ${invoice.customerName}, Type: ${severityLabel(body.reminderType)}, Sent by: ${session.user.id}, Org: ${orgId}`
    );

    return NextResponse.json({
      success: true,
      message: `Dunning reminder (${body.reminderType}) logged for invoice #${invoice.invoiceNumber}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}

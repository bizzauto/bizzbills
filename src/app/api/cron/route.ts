import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

function authorize(request: Request) {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!CRON_SECRET || auth !== CRON_SECRET) {
    return false;
  }
  return true;
}

function calcNextRunDate(date: Date, freq: string, interval: number): Date {
  const d = new Date(date);
  switch (freq) {
    case "daily": d.setDate(d.getDate() + interval); break;
    case "weekly": d.setDate(d.getDate() + 7 * interval); break;
    case "monthly": d.setMonth(d.getMonth() + interval); break;
    case "quarterly": d.setMonth(d.getMonth() + 3 * interval); break;
    case "yearly": d.setFullYear(d.getFullYear() + interval); break;
  }
  return d;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results: string[] = [];

  // 1. Generate due recurring invoices
  const dueInvoices = await prisma.recurringInvoice.findMany({
    where: {
      status: "active",
      nextRunDate: { lte: new Date() },
    },
    include: { lines: true },
  });

  for (const ri of dueInvoices) {
    if (ri.endDate && new Date(ri.endDate) < new Date()) {
      await prisma.recurringInvoice.update({ where: { id: ri.id }, data: { status: "completed" } });
      results.push(`Completed recurring ${ri.id} (end date passed)`);
      continue;
    }

    const firstUser = await prisma.user.findFirst({ where: { orgId: ri.orgId } });

    // Atomic invoice creation inside a transaction to avoid duplicate invoice numbers
    const { invoice, invoiceNumber } = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.invoice.count({ where: { orgId: ri.orgId } });
      const invNum = `INV-${String(existingCount + 1).padStart(4, "0")}`;

      const inv = await tx.invoice.create({
        data: {
          invoiceNumber: invNum,
        customerName: ri.customerName,
        customerGstin: ri.customerGstin ?? "",
        currency: ri.currency,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        status: "sent",
        subtotal: ri.subtotal,
        taxTotal: ri.taxTotal,
        total: ri.total,
        orgId: ri.orgId,
        userId: firstUser?.id ?? "",
        lines: {
          create: ri.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            hsnCode: l.hsnCode ?? "",
          })),
        },
      },
      });
      return { invoice: inv, invoiceNumber: invNum };
    });

    const existingIds: string[] = JSON.parse(ri.invoiceIds);
    existingIds.push(invoice.id);
    const nextRun = calcNextRunDate(new Date(ri.nextRunDate), ri.frequency, ri.interval);

    await prisma.recurringInvoice.update({
      where: { id: ri.id },
      data: { lastRunAt: new Date(), nextRunDate: nextRun, invoiceIds: JSON.stringify(existingIds) },
    });

    results.push(`Generated invoice ${invoiceNumber} from recurring ${ri.id}`);
  }

  // 2. Send payment reminders for overdue invoices
  const reminderSettings = await prisma.reminderSetting.findMany({ where: { enabled: true } });
  const now = new Date();

  for (const rs of reminderSettings) {
    const dueThreshold = new Date(now.getTime() + rs.daysBefore * 86400000);
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        orgId: rs.orgId,
        status: "sent",
        dueDate: { lte: dueThreshold.toISOString().split("T")[0] },
      },
      select: { id: true, invoiceNumber: true, customerName: true, dueDate: true, total: true },
    });

    for (const inv of overdueInvoices) {
      results.push(`Reminder due for Invoice ${inv.invoiceNumber} (${inv.customerName}) — due ${inv.dueDate}, amount ${inv.total}`);
    }
  }

  return NextResponse.json({ processed: results.length, details: results });
}

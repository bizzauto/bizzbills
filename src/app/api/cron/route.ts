import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlanLimit, invoiceCountWhere } from "@/lib/planLimits";
import { calcNextRunDate, type RecurrenceFrequency } from "@/lib/recurring";

const CRON_SECRET = process.env.CRON_SECRET;

function authorize(request: Request) {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!CRON_SECRET || auth !== CRON_SECRET) {
    return false;
  }
  return true;
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

    // ── Plan limit enforcement: skip orgs at their monthly cap ──
    const org = await prisma.organization.findUnique({
      where: { id: ri.orgId },
      select: { plan: true },
    });
    const plan = getPlanLimit(org?.plan);
    if (plan.invoiceLimit !== null) {
      const used = await prisma.invoice.count({ where: invoiceCountWhere(ri.orgId) });
      if (used >= plan.invoiceLimit) {
        await prisma.recurringInvoice.update({ where: { id: ri.id }, data: { status: "paused" } });
        results.push(`Paused recurring ${ri.id} (plan invoice limit reached)`);
        continue;
      }
    }

    const firstUser = await prisma.user.findFirst({ where: { orgId: ri.orgId } });

    // Atomic invoice creation inside a transaction to avoid duplicate invoice numbers
    const { invoice, invoiceNumber } = await prisma.$transaction(async (tx) => {
      // Detect collisions before creating: the padded sequence may already exist
      let invNum = `INV-${String(await tx.invoice.count({ where: { orgId: ri.orgId } }) + 1).padStart(4, "0")}`;
      const collision = await tx.invoice.findFirst({
        where: { orgId: ri.orgId, invoiceNumber: invNum },
        select: { id: true },
      });
      if (collision) {
        invNum = `${invNum}-${Date.now().toString(36).toUpperCase()}`;
      }

      const inv = await tx.invoice.create({
        data: {
          invoiceNumber: invNum,
        customerName: ri.customerName,
        customerGstin: ri.customerGstin ?? "",
        currency: ri.currency,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        status: "pending",
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

    // invoiceIds may be "" or a JSON array; never let an empty/legacy value crash the cron.
    let existingIds: string[] = [];
    try {
      const parsed = JSON.parse(ri.invoiceIds || "[]");
      existingIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      existingIds = [];
    }
    existingIds.push(invoice.id);
    const nextRun = calcNextRunDate(new Date(ri.nextRunDate), ri.frequency as RecurrenceFrequency, ri.interval);

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

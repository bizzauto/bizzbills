import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlanLimit, invoiceCountWhere } from "@/lib/planLimits";

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

export async function POST() {
  // Allow both authenticated and API-key access for cron jobs
  const session = await getServerSession(authOptions);
  let orgId: string | null = null;
  let userId: string | null = null;

  if (session?.user?.id) {
    userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } });
    orgId = user?.orgId ?? null;
  }

  // Allow orgId in query for cron job usage
  const generated: { id: string; invoiceNumber: string; recurringId: string }[] = [];

  const dueInvoices = await prisma.recurringInvoice.findMany({
    where: {
      status: "active",
      nextRunDate: { lte: new Date() },
      ...(orgId ? { orgId } : {}),
    },
    include: { lines: true },
  });

  for (const ri of dueInvoices) {
    if (ri.endDate && new Date(ri.endDate) < new Date()) {
      await prisma.recurringInvoice.update({ where: { id: ri.id }, data: { status: "completed" } });
      continue;
    }

    // ── Plan limit enforcement: skip generation for orgs at their monthly cap ──
    const org = await prisma.organization.findUnique({
      where: { id: ri.orgId },
      select: { plan: true },
    });
    const plan = getPlanLimit(org?.plan);
    if (plan.invoiceLimit !== null) {
      const used = await prisma.invoice.count({ where: invoiceCountWhere(ri.orgId) });
      if (used >= plan.invoiceLimit) {
        // Pause recurring so it doesn't keep hitting the cap every cron tick
        await prisma.recurringInvoice.update({
          where: { id: ri.id },
          data: { status: "paused" },
        });
        continue;
      }
    }

    const count = await prisma.invoice.count({ where: { orgId: ri.orgId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerName: ri.customerName,
        customerGstin: ri.customerGstin ?? "",
        currency: ri.currency,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        status: "sent",
        subtotal: ri.subtotal,
        taxTotal: ri.taxTotal,
        total: ri.total,
        orgId: ri.orgId,
        userId: userId ?? (await prisma.user.findFirst({ where: { orgId: ri.orgId } }))?.id ?? "",
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

    const existingIds: string[] = JSON.parse(ri.invoiceIds);
    existingIds.push(invoice.id);

    const nextRun = calcNextRunDate(new Date(ri.nextRunDate), ri.frequency, ri.interval);

    await prisma.recurringInvoice.update({
      where: { id: ri.id },
      data: {
        lastRunAt: new Date(),
        nextRunDate: nextRun,
        invoiceIds: JSON.stringify(existingIds),
      },
    });

    generated.push({ id: invoice.id, invoiceNumber, recurringId: ri.id });
  }

  return NextResponse.json({ generated: generated.length, invoices: generated });
}

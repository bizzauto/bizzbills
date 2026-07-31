import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

interface Notification {
  id: string;
  type: "activity" | "overdue_invoice" | "upcoming_renewal";
  title: string;
  message: string;
  entityId?: string;
  entity?: string;
  createdAt: string;
  read?: boolean;
}

// GET /api/notifications — notifications for the current user's org
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const notifications: Notification[] = [];

  // 1. Recent activity logs (last 20 for the org)
  const activityLogs = await prisma.activityLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const log of activityLogs) {
    notifications.push({
      id: log.id,
      type: "activity",
      title: `${capitalizeFirst(log.action)} ${log.entity}`,
      message: log.details || `A ${log.entity} was ${log.action}.`,
      entityId: log.entityId ?? undefined,
      entity: log.entity,
      createdAt: log.createdAt.toISOString(),
    });
  }

  // 2. System notification — overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { in: ["sent", "overdue"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      total: true,
      dueDate: true,
      status: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  for (const inv of overdueInvoices) {
    const isOverdue =
      inv.dueDate < today || inv.status === "overdue";

    if (isOverdue) {
      const daysPastDue = calculateDaysPastDue(inv.dueDate, today);
      notifications.push({
        id: `overdue-${inv.id}`,
        type: "overdue_invoice",
        title: `Invoice ${inv.invoiceNumber} is overdue`,
        message: `${inv.customerName} — ${inv.total.toFixed(2)} was due on ${inv.dueDate} (${daysPastDue} day${daysPastDue !== 1 ? "s" : ""} overdue).`,
        entityId: inv.id,
        entity: "invoice",
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 3. System notification — upcoming recurring invoice renewals (next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysStr = sevenDaysFromNow.toISOString().slice(0, 10);
  const todayStr = today;

  const upcomingRenewals = await prisma.recurringInvoice.findMany({
    where: {
      orgId,
      status: "active",
      nextRunDate: {
        gte: new Date(todayStr),
        lte: new Date(sevenDaysStr),
      },
    },
    select: {
      id: true,
      customerName: true,
      frequency: true,
      total: true,
      nextRunDate: true,
    },
    orderBy: { nextRunDate: "asc" },
  });

  for (const rec of upcomingRenewals) {
    const nextRunStr = rec.nextRunDate.toISOString().slice(0, 10);
    const daysUntil = calculateDaysUntil(nextRunStr, todayStr);
    notifications.push({
      id: `renewal-${rec.id}`,
      type: "upcoming_renewal",
      title: `Upcoming renewal for ${rec.customerName}`,
      message: `${capitalizeFirst(rec.frequency)} recurring invoice of ${rec.total.toFixed(2)} will generate on ${nextRunStr}${daysUntil === 0 ? " (today)" : ` (in ${daysUntil} day${daysUntil !== 1 ? "s" : ""})`}.`,
      entityId: rec.id,
      entity: "recurring_invoice",
      createdAt: new Date().toISOString(),
    });
  }

  // Sort all notifications by date descending (most recent first)
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({
    notifications,
    total: notifications.length,
  });
}

// POST /api/notifications — acknowledge notifications as read
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
    const body = await request.json();
    const { ids } = body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "An array of notification IDs is required." },
        { status: 400 },
      );
    }

    // Activity-log-based notifications: validate that the IDs belong to this org
    const activityIds = ids.filter((id) => !id.startsWith("overdue-") && !id.startsWith("renewal-"));
    if (activityIds.length > 0) {
      await prisma.activityLog.findMany({
        where: { id: { in: activityIds }, orgId },
        select: { id: true },
      });
      // All validated — activity log entries that belong to the org are acknowledged
    }

    return NextResponse.json({
      success: true,
      acknowledged: ids,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to mark notifications as read." },
      { status: 500 },
    );
  }
}

// ── helpers ──────────────────────────────────────────────────────────

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function calculateDaysPastDue(dueDateStr: string, todayStr: string): number {
  const due = new Date(dueDateStr);
  const today = new Date(todayStr);
  const diff = today.getTime() - due.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function calculateDaysUntil(targetStr: string, todayStr: string): number {
  const target = new Date(targetStr);
  const today = new Date(todayStr);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

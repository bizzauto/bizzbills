import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const asOfDate = searchParams.get("asOfDate") ?? new Date().toISOString().split("T")[0];
  const asOf = new Date(asOfDate);

  const invoices = await prisma.invoice.findMany({
    where: { orgId, status: { in: ["sent", "overdue"] } },
    select: { id: true, customerName: true, total: true, dueDate: true, status: true, payments: { where: { status: "completed" }, select: { amount: true } } },
  });

  function daysOver(due: string): number {
    return Math.max(0, Math.floor((asOf.getTime() - new Date(due).getTime()) / 86400000));
  }

  type Bucket = { label: string; min: number; max: number; total: number; count: number; invoices: { customerName: string; total: number; dueDate: string; daysOverdue: number }[] };
  const buckets: Bucket[] = [
    { label: "0–15 days", min: 0, max: 15, total: 0, count: 0, invoices: [] },
    { label: "16–30 days", min: 16, max: 30, total: 0, count: 0, invoices: [] },
    { label: "31–45 days", min: 31, max: 45, total: 0, count: 0, invoices: [] },
    { label: ">45 days", min: 46, max: Infinity, total: 0, count: 0, invoices: [] },
  ];

  for (const inv of invoices) {
    const collected = inv.payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = inv.total - collected;
    if (outstanding <= 0) continue;

    const overdue = daysOver(inv.dueDate);
    for (const b of buckets) {
      if (overdue >= b.min && overdue <= b.max) {
        b.total += outstanding;
        b.count++;
        b.invoices.push({ customerName: inv.customerName, total: outstanding, dueDate: inv.dueDate, daysOverdue: overdue });
        break;
      }
    }
  }

  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);

  return NextResponse.json({ asOfDate, buckets, grandTotal: +grandTotal.toFixed(2) });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const invoices = await prisma.invoice.findMany({
    where: { orgId, status: { in: ["sent", "overdue"] } },
    include: { payments: { where: { status: "completed" }, select: { amount: true } } },
    orderBy: { dueDate: "asc" },
  });

  const outstanding = invoices.map((inv) => {
    const collected = inv.payments.reduce((s, p) => s + p.amount, 0);
    return { id: inv.id, invoiceNumber: inv.invoiceNumber, customerName: inv.customerName, total: inv.total, collected, outstanding: +(inv.total - collected).toFixed(2), dueDate: inv.dueDate, status: inv.status };
  }).filter((i) => i.outstanding > 0);

  const totalOutstanding = outstanding.reduce((s, i) => s + i.outstanding, 0);

  return NextResponse.json({ outstanding, totalOutstanding: +totalOutstanding.toFixed(2), count: outstanding.length });
}


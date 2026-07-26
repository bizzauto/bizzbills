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

  const runs = await prisma.payrollRun.findMany({ where: { orgId }, include: { employee: { select: { name: true } } }, orderBy: [{ year: "desc" }, { month: "desc" }] });
  return NextResponse.json(runs);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { employeeIds, month, year } = await request.json();
  if (!employeeIds?.length) return NextResponse.json({ error: "No employees selected" }, { status: 400 });

  const employees = await prisma.employee.findMany({ where: { id: { in: employeeIds }, orgId } });
  let count = 0;

  for (const emp of employees) {
    const exists = await prisma.payrollRun.findUnique({ where: { orgId_employeeId_month_year: { orgId, employeeId: emp.id, month, year } } });
    if (exists) continue;

    await prisma.payrollRun.create({
      data: { orgId, month, year, employeeId: emp.id, grossPay: emp.salary, deductions: 0, netPay: emp.salary, status: "draft" },
    });
    count++;
  }

  return NextResponse.json({ count });
}


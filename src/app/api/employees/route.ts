import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const employees = await prisma.employee.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await request.json();
  const employee = await prisma.employee.create({
    data: { orgId, code: body.code, name: body.name, department: body.department || "", designation: body.designation || "", salary: body.salary || 0, bankName: body.bankName || "", accountNumber: body.accountNumber || "", ifscCode: body.ifscCode || "" },
  });
  return NextResponse.json(employee, { status: 201 });
}

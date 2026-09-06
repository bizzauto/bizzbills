import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

/** Whitelist of employee fields clients may set — never spread the raw request body. */
function pickEmployeeFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const stringField = (key: string) => {
    if (typeof body[key] === "string") fields[key] = body[key];
  };
  const numberField = (key: string) => {
    if (typeof body[key] === "number") fields[key] = body[key];
  };
  const boolField = (key: string) => {
    if (typeof body[key] === "boolean") fields[key] = body[key];
  };
  const dateField = (key: string) => {
    if (typeof body[key] === "string" && !isNaN(Date.parse(body[key] as string))) {
      fields[key] = new Date(body[key] as string);
    }
  };
  stringField("code");
  stringField("name");
  stringField("email");
  stringField("phone");
  stringField("department");
  stringField("designation");
  stringField("bankName");
  stringField("accountNumber");
  stringField("ifscCode");
  numberField("salary");
  boolField("isActive");
  dateField("doj");
  // Server-owned: orgId — never client-set.
  return fields;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  // Ownership check — the employee must belong to the caller's org.
  const existing = await prisma.employee.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const employeeData = pickEmployeeFields(body);

  const employee = await prisma.employee.update({ where: { id }, data: employeeData });
  return NextResponse.json(employee);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  // Ownership check — only soft-delete employees in the caller's org.
  await prisma.employee.updateMany({
    where: { id, orgId },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}

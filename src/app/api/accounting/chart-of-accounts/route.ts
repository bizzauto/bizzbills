import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET() {
  const { orgId } = (await getSessionOrg()) ?? {};
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.chartOfAccount.findMany({
    where: { orgId },
    orderBy: { code: "asc" },
    include: { parent: { select: { id: true, name: true, code: true } } },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const { orgId } = (await getSessionOrg()) ?? {};
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.code || !body?.name || !body?.type) {
    return NextResponse.json({ error: "Code, name, and type are required" }, { status: 400 });
  }

  // Check for existing accounts by both code and name (unique constraint)
  const existingByCode = await prisma.chartOfAccount.findFirst({
    where: { orgId, code: body.code },
  });
  const existingByName = await prisma.chartOfAccount.findFirst({
    where: { orgId, name: body.name },
  });

  if (existingByCode || existingByName) {
    return NextResponse.json(
      {
        error: existingByCode && existingByName
          ? `Account with code "${body.code}" and name "${body.name}" already exists`
          : existingByCode
          ? `Account with code "${body.code}" already exists in this organization`
          : `Account with name "${body.name}" already exists in this organization`,
        code: "DUPLICATE_ACCOUNT",
        ...(existingByCode && { duplicateBy: "code" }),
        ...(existingByName && { duplicateBy: "name" }),
      },
      { status: 409 },
    );
  }

  const account = await prisma.chartOfAccount.create({
    data: {
      orgId,
      code: body.code,
      name: body.name,
      type: body.type,
      parentId: body.parentId ?? null,
    },
  });

  return NextResponse.json(account, { status: 201 });
}

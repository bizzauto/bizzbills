import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });
  return user?.orgId;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getSessionOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  try {
    const account = await prisma.chartOfAccount.update({
      where: { id, orgId },
      data: {
        code: body?.code,
        name: body?.name,
        type: body?.type,
        parentId: body?.parentId ?? null,
        isActive: body?.isActive,
      },
    });
    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getSessionOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.chartOfAccount.delete({
      where: { id, orgId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
}
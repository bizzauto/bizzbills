import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { code?: string; description?: string; type?: string; taxRate?: number; isActive?: boolean };
  const updates: Record<string, unknown> = {};
  if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.type !== undefined) updates.type = body.type;
  if (body.taxRate !== undefined) updates.taxRate = body.taxRate;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const code = await prisma.hsnSacCode.update({
    where: { id, orgId: ctx.orgId },
    data: updates,
  });

  return NextResponse.json(code);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.hsnSacCode.delete({
    where: { id, orgId: ctx.orgId },
  });

  return NextResponse.json({ success: true });
}

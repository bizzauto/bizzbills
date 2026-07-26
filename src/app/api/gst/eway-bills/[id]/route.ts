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
  return { orgId: user?.orgId, userId: session.user.id };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = (await request.json()) as {
    status?: string;
    vehicleNumber?: string;
    distance?: number;
  };
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.vehicleNumber !== undefined) updates.vehicleNumber = body.vehicleNumber.trim();
  if (body.distance !== undefined) updates.distance = body.distance;

  const bill = await prisma.ewayBill.update({
    where: { id, orgId: ctx.orgId },
    data: updates,
  });

  return NextResponse.json(bill);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.ewayBill.delete({
    where: { id, orgId: ctx.orgId },
  });

  return NextResponse.json({ success: true });
}
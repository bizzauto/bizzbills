import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, orgId }, include: { lines: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const { lines, ...data } = await request.json();

  if (lines) {
    await prisma.orderLine.deleteMany({ where: { orderId: id } });
  }
  const order = await prisma.order.update({
    where: { id },
    data: {
      ...data,
      ...(lines ? { lines: { create: lines } } : {}),
    },
    include: { lines: true },
  });
  return NextResponse.json(order);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  await prisma.order.deleteMany({ where: { id, orgId } });
  return NextResponse.json({ success: true });
}

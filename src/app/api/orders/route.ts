import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const where: any = { orgId };
  if (type) where.orderType = type;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({ where, include: { lines: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    if (!body.orderNumber || !body.orderDate) {
      return NextResponse.json({ error: "orderNumber and orderDate are required" }, { status: 400 });
    }

    const { lines, ...data } = body;
    const order = await prisma.order.create({
      data: { ...data, orgId, lines: { create: lines || [] } },
      include: { lines: true },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}


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

  const discounts = await prisma.discount.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(discounts);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Discount name is required" }, { status: 400 });
    }
    if (body.value === undefined || body.value === null) {
      return NextResponse.json({ error: "Discount value is required" }, { status: 400 });
    }

    const discount = await prisma.discount.create({
      data: {
        orgId,
        name: body.name,
        type: body.type || "percentage",
        value: body.value,
        minAmount: body.minAmount ?? 0,
        minQuantity: body.minQuantity ?? 1,
        maxUses: body.maxUses ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(discount, { status: 201 });
  } catch (error) {
    console.error("POST /api/pricing/discounts error:", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}

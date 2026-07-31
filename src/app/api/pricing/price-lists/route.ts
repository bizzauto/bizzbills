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

  const priceLists = await prisma.priceList.findMany({
    where: { orgId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(priceLists);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Price list name is required" }, { status: 400 });
    }

    const { items, ...listData } = body;

    const priceList = await prisma.priceList.create({
      data: {
        ...listData,
        orgId,
        items: items
          ? {
              create: items.map(
                (item: {
                  productId?: string;
                  productName: string;
                  sku?: string;
                  unitPrice: number;
                  minQuantity?: number;
                  maxQuantity?: number;
                }) => ({
                  productId: item.productId || null,
                  productName: item.productName,
                  sku: item.sku || "",
                  unitPrice: item.unitPrice,
                  minQuantity: item.minQuantity ?? 1,
                  maxQuantity: item.maxQuantity ?? null,
                }),
              ),
            }
          : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(priceList, { status: 201 });
  } catch (error) {
    console.error("POST /api/pricing/price-lists error:", error);
    return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
  }
}

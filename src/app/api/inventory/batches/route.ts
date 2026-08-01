import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where: { orgId: string; productId?: string } = { orgId };
    if (productId) where.productId = productId;

    const batches = await prisma.batch.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("GET /api/inventory/batches error:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    const { productId, batchNumber, quantity, expiryDate, manufactureDate, costPrice } = body;

    if (!productId || !batchNumber) {
      return NextResponse.json({ error: "Product and batch number are required" }, { status: 400 });
    }

    const batch = await prisma.batch.create({
      data: {
        orgId,
        productId,
        batchNumber,
        quantity: quantity ?? 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
        costPrice: costPrice ?? 0,
      },
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    const message = (error as Error).message ?? "";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Batch number already exists for this organization" }, { status: 409 });
    }
    console.error("POST /api/inventory/batches error:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}

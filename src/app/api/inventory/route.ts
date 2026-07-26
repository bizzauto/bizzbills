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

  const items = await prisma.inventoryItem.findMany({
    where: { orgId },
    include: { product: true, warehouse: true },
    orderBy: [{ product: { name: "asc" } }],
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { productId, warehouseId, quantity, minStock, notes } = await request.json();

  // Upsert inventory item (add stock if exists)
  const existing = await prisma.inventoryItem.findFirst({ where: { orgId, productId, warehouseId } });
  let item;
  if (existing) {
    item = await prisma.inventoryItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity, minStock: minStock ?? existing.minStock } });
  } else {
    item = await prisma.inventoryItem.create({ data: { orgId, productId, warehouseId, quantity, minStock: minStock ?? 0 } });
  }

  // Log movement
  await prisma.stockMovement.create({ data: { orgId, productId, warehouseId, type: quantity > 0 ? "in" : "out", quantity: Math.abs(quantity), notes: notes ?? "Stock adjustment" } });

  return NextResponse.json(item, { status: 201 });
}


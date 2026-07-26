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
  const productId = searchParams.get("productId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const where: any = { orgId };
  if (productId) where.productId = productId;

  const movements = await prisma.stockMovement.findMany({ where, include: { product: true, warehouse: true }, orderBy: { createdAt: "desc" }, take: limit });
  return NextResponse.json(movements);
}


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const where: any = { orgId };
  if (category) where.category = category;
  if (search) where.OR = [{ name: { contains: search } }, { sku: { contains: search } }];

  const products = await prisma.product.findMany({ where, include: { inventory: true }, orderBy: { name: "asc" } });
  const categories = await prisma.product.findMany({ where: { orgId }, select: { category: true }, distinct: ["category"] });

  return NextResponse.json({ products, categories: categories.map((c) => c.category).filter(Boolean) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const data = await request.json();
  const product = await prisma.product.create({ data: { ...data, orgId }, include: { inventory: true } });
  return NextResponse.json(product, { status: 201 });
}

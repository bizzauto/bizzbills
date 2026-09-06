import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";



export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  // Case-insensitive search across name and SKU. Postgres `contains` is
  // case-sensitive, so "fan" would not match "FAN COIL" — `mode: insensitive`
  // makes autocomplete work regardless of stored casing.
  const where: {
    orgId: string;
    category?: string;
    OR?: Prisma.ProductWhereInput["OR"];
  } = { orgId };
  if (category) where.category = category;
  if (search) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({ where, include: { inventory: true }, orderBy: { name: "asc" } });
  const categories = await prisma.product.findMany({ where: { orgId }, select: { category: true }, distinct: ["category"] });

  return NextResponse.json({ products, categories: categories.map((c) => c.category).filter(Boolean) });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    // Whitelist fields — never spread the raw request body into the DB.
    const productData: Record<string, unknown> = {};
    const stringField = (key: string) => {
      if (typeof data[key] === "string") productData[key] = data[key];
    };
    const numberField = (key: string) => {
      if (typeof data[key] === "number") productData[key] = data[key];
    };
    const boolField = (key: string) => {
      if (typeof data[key] === "boolean") productData[key] = data[key];
    };
    stringField("name");
    stringField("description");
    stringField("sku");
    stringField("hsnCode");
    stringField("unit");
    stringField("category");
    stringField("brand");
    stringField("image");
    numberField("sellingPrice");
    numberField("purchasePrice");
    numberField("taxRate");
    boolField("isActive");

    const name = productData.name as string | undefined;
    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const product = await prisma.product.create({ data: { ...productData, name, orgId }, include: { inventory: true } });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}


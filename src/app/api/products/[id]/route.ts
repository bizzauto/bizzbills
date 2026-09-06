import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const product = await prisma.product.findFirst({ where: { id, orgId }, include: { inventory: { include: { warehouse: true } }, movements: { orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const data = await request.json();

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

  const product = await prisma.product.updateMany({ where: { id, orgId }, data: productData });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  await prisma.product.deleteMany({ where: { id, orgId } });
  return NextResponse.json({ success: true });
}


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

  const warehouses = await prisma.warehouse.findMany({ where: { orgId }, include: { inventory: { include: { product: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(warehouses);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const data = await request.json();

  // Whitelist fields — never spread the raw request body into the DB.
  const warehouseData: Record<string, unknown> = {};
  const stringField = (key: string) => {
    if (typeof data[key] === "string") warehouseData[key] = data[key];
  };
  const boolField = (key: string) => {
    if (typeof data[key] === "boolean") warehouseData[key] = data[key];
  };
  stringField("name");
  stringField("address");
  stringField("city");
  stringField("state");
  boolField("isActive");

  const name = warehouseData.name as string | undefined;
  if (!name) {
    return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });
  }

  const warehouse = await prisma.warehouse.create({ data: { ...warehouseData, name, orgId } });
  return NextResponse.json(warehouse, { status: 201 });
}


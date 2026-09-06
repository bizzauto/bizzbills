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

  const where: { orgId: string; orderType?: string; status?: string } = { orgId };
  if (type) where.orderType = type;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({ where, include: { lines: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

type OrderLineInput = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
  hsnCode?: string;
  productId?: string;
};

/** Whitelist of fields clients may set — never spread the raw request body. */
function pickOrderFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const stringField = (key: string) => {
    if (typeof body[key] === "string") fields[key] = body[key];
  };
  const numberField = (key: string) => {
    if (typeof body[key] === "number") fields[key] = body[key];
  };
  const dateField = (key: string) => {
    if (typeof body[key] === "string" && !isNaN(Date.parse(body[key] as string))) {
      fields[key] = new Date(body[key] as string);
    }
  };

  stringField("orderNumber");
  stringField("orderType");
  stringField("status");
  stringField("partyId");
  stringField("partyName");
  stringField("partyGstin");
  stringField("currency");
  stringField("notes");
  numberField("subtotal");
  numberField("taxTotal");
  numberField("total");
  dateField("orderDate");
  dateField("deliveryDate");

  return fields;
}

/** Compute totals from line items — the server is the source of truth for money. */
function computeTotals(lines: OrderLineInput[]) {
  let subtotal = 0;
  let taxTotal = 0;
  for (const l of lines) {
    const qty = Number(l.quantity) || 0;
    const rate = Number(l.unitPrice) || 0;
    const taxRate = Number(l.taxRate) || 0;
    const lineTotal = Math.round(qty * rate * 100) / 100;
    subtotal = Math.round((subtotal + lineTotal) * 100) / 100;
    taxTotal = Math.round((taxTotal + (lineTotal * taxRate) / 100) * 100) / 100;
  }
  return { subtotal, taxTotal, total: Math.round((subtotal + taxTotal) * 100) / 100 };
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

    const data = pickOrderFields(body);
    const orderNumber = data.orderNumber as string | undefined;
    const orderDate = data.orderDate as Date | undefined;
    if (!orderNumber || !orderDate) {
      return NextResponse.json({ error: "Invalid orderNumber or orderDate" }, { status: 400 });
    }

    const lines: OrderLineInput[] = Array.isArray(body.lines) ? body.lines : [];
    const totals = computeTotals(lines);
    data.subtotal = totals.subtotal;
    data.taxTotal = totals.taxTotal;
    data.total = totals.total;

    const order = await prisma.order.create({
      data: {
        ...data,
        orderNumber,
        orderDate,
        orgId,
        lines: {
          create: lines.map((l) => ({
            description: l.description ?? "",
            quantity: Number(l.quantity) || 0,
            unitPrice: Number(l.unitPrice) || 0,
            taxRate: Number(l.taxRate) || 0,
            hsnCode: l.hsnCode ?? "",
            productId: l.productId ?? null,
          })),
        },
      },
      include: { lines: true },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

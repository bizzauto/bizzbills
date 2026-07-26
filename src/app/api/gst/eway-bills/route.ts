import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });
  return { orgId: user?.orgId, userId: session.user.id };
}

export async function GET() {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bills = await prisma.ewayBill.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { ewbDate: "desc" },
  });

  return NextResponse.json(bills);
}

export async function POST(request: Request) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    invoiceId?: string;
    ewbNumber: string;
    fromAddress: string;
    toAddress: string;
    transportMode?: string;
    vehicleNumber?: string;
    distance?: number;
  };

  const bill = await prisma.ewayBill.create({
    data: {
      orgId: ctx.orgId,
      invoiceId: body.invoiceId,
      ewbNumber: body.ewbNumber.trim().toUpperCase(),
      ewbDate: new Date(),
      fromAddress: body.fromAddress.trim(),
      toAddress: body.toAddress.trim(),
      transportMode: body.transportMode || "road",
      vehicleNumber: body.vehicleNumber?.trim(),
      distance: body.distance || 0,
    },
  });

  return NextResponse.json(bill, { status: 201 });
}
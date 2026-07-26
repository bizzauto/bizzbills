import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



function calcNextRunDate(date: Date, freq: string, interval: number): Date {
  const d = new Date(date);
  switch (freq) {
    case "daily": d.setDate(d.getDate() + interval); break;
    case "weekly": d.setDate(d.getDate() + 7 * interval); break;
    case "monthly": d.setMonth(d.getMonth() + interval); break;
    case "quarterly": d.setMonth(d.getMonth() + 3 * interval); break;
    case "yearly": d.setFullYear(d.getFullYear() + interval); break;
  }
  return d;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const invoices = await prisma.recurringInvoice.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const body = await request.json();
    const { customerName, customerGstin, currency, frequency, interval, startDate, endDate, lines } = body as {
      customerName: string;
      customerGstin?: string;
      currency?: string;
      frequency: string;
      interval?: number;
      startDate: string;
      endDate?: string;
      lines: { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string }[];
    };

    if (!customerName || !frequency || !startDate || !lines?.length) {
      return NextResponse.json({ error: "customerName, frequency, startDate, and lines are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    let subtotal = 0;
    let taxTotal = 0;
    const cleanLines = lines.map((l) => {
      const lineTotal = l.quantity * l.unitPrice;
      const lineTax = (lineTotal * l.taxRate) / 100;
      subtotal += lineTotal;
      taxTotal += lineTax;
      return { description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate, hsnCode: l.hsnCode ?? "" };
    });
    const total = subtotal + taxTotal;

    const inv = (freq: string, interval: number) => {
      if (freq === "daily") return interval;
      if (freq === "weekly") return 7 * interval;
      if (freq === "monthly") return 30 * interval;
      if (freq === "quarterly") return 90 * interval;
      return 365 * interval;
    };

    const created = await prisma.recurringInvoice.create({
      data: {
        orgId,
        customerName,
        customerGstin: customerGstin ?? "",
        currency: currency ?? "INR",
        frequency,
        interval: interval ?? 1,
        startDate: start,
        endDate: end,
        nextRunDate: start,
        subtotal,
        taxTotal,
        total,
        status: "active",
        lines: { create: cleanLines },
      },
      include: { lines: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create recurring invoice" }, { status: 500 });
  }
}


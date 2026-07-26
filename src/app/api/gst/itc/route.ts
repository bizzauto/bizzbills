import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET() {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId: ctx.orgId,
      status: { in: ["paid", "sent"] },
      customerGstin: { not: "" },
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
      },
    },
    include: { lines: true },
  });

  const itcByRate: Record<string, { taxableAmount: number; gstAmount: number; count: number }> = {};
  let totalItc = 0;

  for (const inv of invoices) {
    for (const line of inv.lines) {
      if (line.taxRate <= 0) continue;
      const lineTotal = line.quantity * line.unitPrice;
      const taxAmount = (lineTotal * line.taxRate) / 100;
      const rateKey = `${line.taxRate}%`;
      if (!itcByRate[rateKey]) {
        itcByRate[rateKey] = { taxableAmount: 0, gstAmount: 0, count: 0 };
      }
      itcByRate[rateKey].taxableAmount += lineTotal;
      itcByRate[rateKey].gstAmount += taxAmount;
      itcByRate[rateKey].count += 1;
      totalItc += taxAmount;
    }
  }

  return NextResponse.json({
    period: "Last 3 months",
    totalItc: Math.round(totalItc * 100) / 100,
    byRate: itcByRate,
    eligibleInvoices: invoices.length,
  });
}

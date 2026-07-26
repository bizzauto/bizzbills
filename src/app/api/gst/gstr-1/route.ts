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
      status: "sent",
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });

  const outwardByRate: Record<string, { taxableAmount: number; gstAmount: number; count: number }> = {};
  let totalTaxable = 0;
  let totalGst = 0;

  for (const inv of invoices) {
    for (const line of inv.lines) {
      const lineTotal = line.quantity * line.unitPrice;
      const taxAmount = (lineTotal * line.taxRate) / 100;
      const rateKey = `${line.taxRate}%`;
      if (!outwardByRate[rateKey]) {
        outwardByRate[rateKey] = { taxableAmount: 0, gstAmount: 0, count: 0 };
      }
      outwardByRate[rateKey].taxableAmount += lineTotal;
      outwardByRate[rateKey].gstAmount += taxAmount;
      outwardByRate[rateKey].count += 1;
      totalTaxable += lineTotal;
      totalGst += taxAmount;
    }
  }

  const summary = {
    period: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      to: new Date(),
    },
    totalInvoices: invoices.length,
    totalTaxableAmount: Math.round(totalTaxable * 100) / 100,
    totalGstAmount: Math.round(totalGst * 100) / 100,
    byRate: outwardByRate,
  };

  return NextResponse.json(summary);
}

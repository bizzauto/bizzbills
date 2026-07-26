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
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    include: { lines: true },
  });

  let outwardTaxable = 0;
  let outwardGst = 0;
  let interStateTaxable = 0;
  let interStateGst = 0;
  let intraStateTaxable = 0;
  let intraStateGst = 0;
  let nilRatedTaxable = 0;
  let exemptTaxable = 0;

  for (const inv of invoices) {
    for (const line of inv.lines) {
      const lineTotal = line.quantity * line.unitPrice;
      const taxAmount = (lineTotal * line.taxRate) / 100;
      if (line.taxRate === 0) {
        nilRatedTaxable += lineTotal;
      } else if (line.taxRate === 0.01) {
        exemptTaxable += lineTotal;
      } else {
        outwardTaxable += lineTotal;
        outwardGst += taxAmount;
      }
    }
  }

  const inputTaxCredit = await prisma.ledger.findMany({
    where: {
      orgId: ctx.orgId,
      accountId: {
        contains: "input-tax",
      },
      entryDate: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    select: { debit: true, credit: true },
  });

  const itcTotal = inputTaxCredit.reduce((sum, l) => sum + l.credit, 0);

  return NextResponse.json({
    period: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      to: new Date(),
    },
    outwardSupplies: {
      totalTaxable: Math.round(outwardTaxable * 100) / 100,
      totalGst: Math.round(outwardGst * 100) / 100,
      interState: { taxable: Math.round(interStateTaxable * 100) / 100, gst: Math.round(interStateGst * 100) / 100 },
      intraState: { taxable: Math.round(intraStateTaxable * 100) / 100, gst: Math.round(intraStateGst * 100) / 100 },
      nilRated: Math.round(nilRatedTaxable * 100) / 100,
      exempt: Math.round(exemptTaxable * 100) / 100,
    },
    inputTaxCredit: {
      totalItc: Math.round(itcTotal * 100) / 100,
    },
    netTaxPayable: Math.round((outwardGst - itcTotal) * 100) / 100,
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

/**
 * Tally-compatible JSON Export
 * Exports invoices, ledger entries, and GSTR data in Tally-importable format.
 * Supports: invoices, ledger, gstr1
 */

interface TallyVoucher {
  _VCHTYPE: string;
  _OBJVIEW: string;
  VOUCHER: {
    DATE: string;
    VOUCHERNUMBER: string;
    VOUCHERTYPE: string;
    PARTYLEDGERNAME: string;
    amount: number;
    BASICBASEPARTYNAME: string;
    LEDGERENTRIES: {
      LEDGERNAME: string;
      ISDEEMEDPOSITIVE: string;
      amount: number;
    }[];
  };
}

function formatDateForTally(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "vouchers"; // vouchers, ledger, gstr1
  const fromDate = searchParams.get("fromDate") ?? "2024-01-01";
  const toDate =
    searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  try {
    if (format === "gstr1") {
      return await exportGstr1(orgId, fromDate, toDate);
    }
    if (format === "ledger") {
      return await exportLedger(orgId, fromDate, toDate);
    }
    return await exportVouchers(orgId, fromDate, toDate);
  } catch {
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}

async function exportVouchers(
  orgId: string,
  fromDate: string,
  toDate: string
): Promise<NextResponse> {
  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { not: "draft" },
      createdAt: {
        gte: new Date(fromDate),
        lte: new Date(toDate + "T23:59:59.999Z"),
      },
    },
    include: { lines: true },
    orderBy: { createdAt: "asc" },
  });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, gstin: true },
  });

  const vouchers: TallyVoucher[] = invoices.map((inv) => ({
    _VCHTYPE: "Sales",
    _OBJVIEW: "Accounting Voucher View",
    VOUCHER: {
      DATE: formatDateForTally(new Date(inv.createdAt)),
      VOUCHERNUMBER: inv.invoiceNumber,
      VOUCHERTYPE: "Sales",
      PARTYLEDGERNAME: inv.customerName,
      amount: inv.total,
      BASICBASEPARTYNAME: inv.customerName,
      LEDGERENTRIES: [
        {
          LEDGERNAME: inv.customerName,
          ISDEEMEDPOSITIVE: "No",
          amount: inv.total,
        },
        {
          LEDGERNAME: "Sales Account",
          ISDEEMEDPOSITIVE: "Yes",
          amount: inv.subtotal,
        },
        ...(inv.taxTotal > 0
          ? [
              {
                LEDGERNAME: "Output CGST",
                ISDEEMEDPOSITIVE: "Yes",
                amount: inv.taxTotal / 2,
              },
              {
                LEDGERNAME: "Output SGST",
                ISDEEMEDPOSITIVE: "Yes",
                amount: inv.taxTotal / 2,
              },
            ]
          : []),
      ],
    },
  }));

  const tallyData = {
    ENVELOPE: {
      HEADER: {
        TALLYMESSAGE: {
          DATE: formatDateForTally(new Date()),
          COMPANIONAME: org?.name ?? "Unknown",
        },
      },
      BODY: {
        IMPORTDATA: {
          REQUESTDESC: {
            REPORTNAME: "Vouchers",
            STATICVARIABLES: {
              SVEXPORTFORMAT: "$$SysName:JSON",
            },
          },
          BODY: {
            COLLECTION: {
              TALLYMESSAGE: vouchers,
            },
          },
        },
      },
    },
  };

  return NextResponse.json(tallyData);
}

async function exportLedger(
  orgId: string,
  fromDate: string,
  toDate: string
): Promise<NextResponse> {
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      orgId,
      date: {
        gte: new Date(fromDate),
        lte: new Date(toDate + "T23:59:59.999Z"),
      },
    },
    include: {
      lines: {
        include: {
          account: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const ledgers = journalEntries.flatMap((je) =>
    je.lines.map((line) => ({
      DATE: formatDateForTally(new Date(je.date)),
      VOUCHERNUMBER: je.entryNumber,
      LEDGERNAME: line.account.name,
      DEBIT: line.debit,
      CREDIT: line.credit,
      NARRATION: line.description || je.description,
    }))
  );

  return NextResponse.json({
    ENVELOPE: {
      HEADER: {
        TALLYMESSAGE: {
          COMPANIONAME: org?.name ?? "Unknown",
        },
      },
      BODY: {
        LEDGERS: ledgers,
      },
    },
  });
}

async function exportGstr1(
  orgId: string,
  fromDate: string,
  toDate: string
): Promise<NextResponse> {
  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { not: "draft" },
      createdAt: {
        gte: new Date(fromDate),
        lte: new Date(toDate + "T23:59:59.999Z"),
      },
    },
    include: { lines: true },
    orderBy: { createdAt: "asc" },
  });

  // GSTR-1 B2B section
  const b2b = invoices
    .filter((inv) => inv.customerGstin)
    .map((inv) => ({
      gstin: inv.customerGstin,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: formatDateForTally(new Date(inv.createdAt)),
      invoiceValue: inv.total,
      placeOfSupply: "27-Maharashtra", // default, should be configurable
      reverseCharge: "N",
      items: inv.lines.map((l) => ({
        description: l.description,
        hsnCode: l.hsnCode,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalValue: l.unitPrice * l.quantity,
        taxRate: l.taxRate,
        cgstAmount: (l.unitPrice * l.quantity * l.taxRate) / 200,
        sgstAmount: (l.unitPrice * l.quantity * l.taxRate) / 200,
        igstAmount: 0,
      })),
    }));

  // GSTR-1 B2C section (invoices without GSTIN)
  const b2c = invoices
    .filter((inv) => !inv.customerGstin)
    .map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: formatDateForTally(new Date(inv.createdAt)),
      customerName: inv.customerName,
      placeOfSupply: "27-Maharashtra",
      totalValue: inv.total,
      items: inv.lines.map((l) => ({
        description: l.description,
        hsnCode: l.hsnCode,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalValue: l.unitPrice * l.quantity,
        taxRate: l.taxRate,
      })),
    }));

  // Summary
  const totalTaxable = invoices.reduce((s, inv) => s + inv.subtotal, 0);
  const totalTax = invoices.reduce((s, inv) => s + inv.taxTotal, 0);
  const totalValue = invoices.reduce((s, inv) => s + inv.total, 0);

  return NextResponse.json({
    gstr1: {
      period: `${new Date(fromDate).toLocaleString("en-US", { month: "long" })} ${new Date(fromDate).getFullYear()}`,
      summary: {
        totalInvoices: invoices.length,
        totalTaxableValue: totalTaxable,
        totalTaxAmount: totalTax,
        totalInvoiceValue: totalValue,
        b2bCount: b2b.length,
        b2cCount: b2c.length,
      },
      b2b,
      b2c,
    },
  });
}

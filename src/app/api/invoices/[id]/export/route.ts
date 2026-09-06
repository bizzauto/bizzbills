import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

function escapeCsv(value: string | number): string {
  const str = String(value);
  // Per RFC 4180: wrap in quotes and double internal quotes
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Neutralise CSV/Excel formula injection: values beginning with = + - @ or a
 * tab/CR would otherwise execute as a formula or formula prefix when opened
 * in Excel/LibreOffice. Prefixing with a single quote renders them inert.
 */
function safeCsvCell(value: string | number): string {
  const str = String(value);
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

/** Strip characters that would break the Content-Disposition header. */
function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "invoice";
}

function escapeMarkdownTable(value: string | number): string {
  return String(value).replace(/\|/g, "\\|");
}



export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";

  const orgId = await getSessionOrgId(session.user.id);
  const where: { id: string; userId?: string; orgId?: string } = { id };
  if (orgId) {
    where.orgId = orgId;
  } else {
    where.userId = session.user.id;
  }

  const invoice = await prisma.invoice.findFirst({
    where,
    include: { lines: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const lines = invoice.lines.map((l) => ({
    description: l.description,
    hsnCode: l.hsnCode,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    lineTotal: Math.round(l.quantity * l.unitPrice * (1 + l.taxRate / 100) * 100) / 100,
  }));

  const data = {
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    customerGstin: invoice.customerGstin,
    customerEwayBill: invoice.ewayBillId ?? null,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    status: invoice.status,
    subtotal: Math.round(invoice.subtotal * 100) / 100,
    taxTotal: Math.round(invoice.taxTotal * 100) / 100,
    total: Math.round(invoice.total * 100) / 100,
    version: invoice.version,
    lines,
  };

  if (format === "json") {
    return NextResponse.json(data);
  }

  if (format === "csv") {
    const filename = safeFilename(data.invoiceNumber);
    let csv = "description,hsnCode,quantity,unitPrice,taxRate,lineTotal\n";
    for (const line of data.lines) {
      csv += `${escapeCsv(safeCsvCell(line.description))},${escapeCsv(safeCsvCell(line.hsnCode))},${line.quantity},${line.unitPrice},${line.taxRate},${line.lineTotal.toFixed(2)}\n`;
    }
    csv += `,,,,"${data.subtotal.toFixed(2)}"\n`;
    csv += `,,,,"${data.taxTotal.toFixed(2)}"\n`;
    csv += `,,,,"${data.total.toFixed(2)}"\n`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // Markdown format — pipe characters escaped for table safety
  const markdown = `# Invoice ${data.invoiceNumber}

**Customer:** ${data.customerName}
**GSTIN:** ${data.customerGstin}
**Date:** ${data.dueDate}
**Status:** ${data.status}
**Version:** ${data.version}

| Item | HSN | Qty | Unit Price | GST | Total |
|------|-----|-----|-----------|-----|-------|
${data.lines.map((l) => `| ${escapeMarkdownTable(l.description)} | ${escapeMarkdownTable(l.hsnCode)} | ${l.quantity} | ${l.unitPrice} | ${l.taxRate}% | ${l.lineTotal.toFixed(2)} |`).join("\n")}

| | | | | **Subtotal** | ${data.subtotal.toFixed(2)} |
| | | | | **Tax** | ${data.taxTotal.toFixed(2)} |
| | | | | **Total** | ${data.total.toFixed(2)} |
`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `inline; filename="${safeFilename(data.invoiceNumber)}.md"`,
    },
  });
}


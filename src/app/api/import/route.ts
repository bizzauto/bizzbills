import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { entity, rows } = await request.json();

  if (!entity || !Array.isArray(rows)) {
    return NextResponse.json({ error: "Invalid payload: entity and rows[] required" }, { status: 400 });
  }
  if (rows.length > 5000) {
    return NextResponse.json({ error: "Maximum 5,000 rows per import" }, { status: 400 });
  }

  let created = 0;

  if (entity === "products") {
    for (const row of rows) {
      await prisma.product.upsert({
        where: { orgId_sku: { orgId, sku: row.sku || row.name } },
        update: { name: row.name, sellingPrice: parseFloat(row.sellingPrice) || 0, purchasePrice: parseFloat(row.purchasePrice) || 0, unit: row.unit || "pcs", hsnCode: row.hsnCode || "", category: row.category || "", taxRate: parseFloat(row.taxRate) || 0 },
        create: { orgId, name: row.name, sku: row.sku || row.name, sellingPrice: parseFloat(row.sellingPrice) || 0, purchasePrice: parseFloat(row.purchasePrice) || 0, unit: row.unit || "pcs", hsnCode: row.hsnCode || "", category: row.category || "", taxRate: parseFloat(row.taxRate) || 0 },
      });
      created++;
    }
  } else if (entity === "parties") {
    for (const row of rows) {
      await prisma.party.upsert({
        where: { orgId_name: { orgId, name: row.name } },
        update: { type: row.type || "customer", gstin: row.gstin || "", email: row.email || "", phone: row.phone || "" },
        create: { orgId, type: row.type || "customer", name: row.name, gstin: row.gstin || "", email: row.email || "", phone: row.phone || "" },
      });
      created++;
    }
  } else if (entity === "chart_of_accounts") {
    for (const row of rows) {
      await prisma.chartOfAccount.upsert({
        where: { orgId_code: { orgId, code: row.code } },
        update: { name: row.name, type: row.type || "EXPENSE" },
        create: { orgId, code: row.code, name: row.name, type: row.type || "EXPENSE" },
      });
      created++;
    }
  } else {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 });
  }

  return NextResponse.json({ created, entity });
}


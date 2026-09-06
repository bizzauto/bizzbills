import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";

/**
 * Returns the next sequential invoice number for the org.
 *
 * Looks at existing invoice numbers that share the same prefix (+ postfix)
 * and increments the highest trailing number found: INV-0004 -> INV-0005.
 * Pads to at least 4 digits. When nothing exists yet it starts at INV-0001.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await getSessionOrg() ?? {};

  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix") ?? "INV-";
  const postfix = searchParams.get("postfix") ?? "";

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(orgId ? { orgId } : { userId: session.user.id }),
      invoiceNumber: { startsWith: prefix },
    },
    select: { invoiceNumber: true },
  });

  let max = 0;
  for (const inv of invoices) {
    const number = inv.invoiceNumber;
    if (postfix && !number.endsWith(postfix)) continue;
    const body = number.slice(prefix.length, number.length - postfix.length);
    if (!/^\d+$/.test(body)) continue;
    const n = parseInt(body, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }

  const next = max + 1;
  const padded = String(next).padStart(Math.max(4, String(next).length), "0");
  return NextResponse.json({ nextNumber: `${prefix}${padded}${postfix}` });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";

// TDS sections and their default rates
const TDS_SECTIONS: Record<string, number> = {
  "194C": 1,   // Contractor
  "194J": 10,  // Professional
  "194H": 5,   // Commission
  "194I": 10,  // Rent
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const entries = await prisma.tdsEntry.findMany({
      where: { orgId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET tds entries error:", error);
    return NextResponse.json({ error: "Failed to fetch TDS entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const { partyName, pan, section, amount, tdsRate, tdsAmount, date, invoiceRef } = body;

    if (!partyName || !pan || !section || !amount || !date) {
      return NextResponse.json(
        { error: "Party name, PAN, section, amount, and date are required" },
        { status: 400 }
      );
    }

    // Validate section
    if (!TDS_SECTIONS[section]) {
      return NextResponse.json(
        { error: `Invalid TDS section. Allowed: ${Object.keys(TDS_SECTIONS).join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate TDS if not provided
    const rate = tdsRate || TDS_SECTIONS[section];
    const calculatedAmount = tdsAmount || (parseFloat(amount) * rate) / 100;

    const entry = await prisma.tdsEntry.create({
      data: {
        orgId,
        partyName,
        pan: pan.toUpperCase(),
        section,
        amount: parseFloat(amount),
        tdsRate: rate,
        tdsAmount: calculatedAmount,
        date,
        invoiceRef: invoiceRef || "",
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST tds entry error:", error);
    return NextResponse.json({ error: "Failed to create TDS entry" }, { status: 500 });
  }
}

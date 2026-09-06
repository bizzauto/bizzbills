import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";



export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // customer, vendor, or all
  const search = searchParams.get("search");

  // Case-insensitive search across name, GSTIN, phone, and email. Postgres
  // `contains` is case-sensitive, so matches only fire when the user types the
  // exact stored casing — that is why autocomplete felt broken. `mode: insensitive`
  // makes "raj" match "Rajesh", "RAJ ENT", etc.
  const where: Prisma.PartyWhereInput = { orgId };
  if (type) where.type = type;
  if (search) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { gstin: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  const parties = await prisma.party.findMany({ where, include: { addresses: true }, orderBy: { name: "asc" } });
  return NextResponse.json(parties);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await request.json();
  const { addresses, ...data } = body;

  // Whitelist fields — never spread the raw request body into the DB.
  const partyData: Record<string, unknown> = {};
  const stringField = (key: string) => {
    if (typeof data[key] === "string") partyData[key] = data[key];
  };
  const numberField = (key: string) => {
    if (typeof data[key] === "number") partyData[key] = data[key];
  };
  const boolField = (key: string) => {
    if (typeof data[key] === "boolean") partyData[key] = data[key];
  };
  stringField("type");
  stringField("name");
  stringField("gstin");
  stringField("email");
  stringField("phone");
  stringField("notes");
  numberField("creditLimit");
  boolField("isActive");
  // Server-owned: outstandingBalance is derived from invoices/payments, never client-set.

  const name = partyData.name as string | undefined;
  if (!name) {
    return NextResponse.json({ error: "Party name is required" }, { status: 400 });
  }

  const party = await prisma.party.create({
    data: {
      ...partyData,
      name,
      orgId,
      ...(Array.isArray(addresses) && addresses.length ? { addresses: { create: addresses } } : {}),
    },
    include: { addresses: true },
  });
  return NextResponse.json(party, { status: 201 });
}


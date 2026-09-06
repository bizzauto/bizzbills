import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const party = await prisma.party.findFirst({ where: { id, orgId }, include: { addresses: true } });
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(party);
}

/** Whitelist of party fields clients may set — never spread the raw request body. */
function pickPartyFields(data: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const stringField = (key: string) => {
    if (typeof data[key] === "string") fields[key] = data[key];
  };
  const numberField = (key: string) => {
    if (typeof data[key] === "number") fields[key] = data[key];
  };
  const boolField = (key: string) => {
    if (typeof data[key] === "boolean") fields[key] = data[key];
  };
  stringField("type");
  stringField("name");
  stringField("gstin");
  stringField("email");
  stringField("phone");
  stringField("notes");
  numberField("creditLimit");
  boolField("isActive");
  // Server-owned: orgId, outstandingBalance — never client-set.
  return fields;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  // Ownership check — the party must belong to the caller's org.
  const existing = await prisma.party.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { addresses, ...data } = body;
  const partyData = pickPartyFields(data);

  if (Array.isArray(addresses) && addresses.length > 0) {
    await prisma.partyAddress.deleteMany({ where: { partyId: id } });
  }
  const party = await prisma.party.update({
    where: { id },
    data: {
      ...partyData,
      ...(Array.isArray(addresses) && addresses.length ? { addresses: { create: addresses } } : {}),
    },
    include: { addresses: true },
  });
  return NextResponse.json(party);
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // customer, vendor, or all
  const search = searchParams.get("search");

  const where: any = { orgId };
  if (type) where.type = type;
  if (search) where.name = { contains: search };

  const parties = await prisma.party.findMany({ where, include: { addresses: true }, orderBy: { name: "asc" } });
  return NextResponse.json(parties);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { addresses, ...data } = await request.json();
  const party = await prisma.party.create({
    data: {
      ...data, orgId,
      ...(addresses?.length ? { addresses: { create: addresses } } : {}),
    },
    include: { addresses: true },
  });
  return NextResponse.json(party, { status: 201 });
}


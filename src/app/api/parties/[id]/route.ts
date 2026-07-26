import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const { addresses, ...data } = await request.json();

  await prisma.partyAddress.deleteMany({ where: { partyId: id } });
  const party = await prisma.party.update({
    where: { id },
    data: {
      ...data,
      ...(addresses?.length ? { addresses: { create: addresses } } : {}),
    },
    include: { addresses: true },
  });
  return NextResponse.json(party);
}

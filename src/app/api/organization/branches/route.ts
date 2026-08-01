import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const branches = await prisma.branch.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  return NextResponse.json({ branches });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  // Only admins can create branches
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "ORG_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstin?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.branch.findFirst({
      where: { orgId, name: body.name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 409 }
      );
    }

    const branch = await prisma.branch.create({
      data: {
        orgId,
        name: body.name.trim(),
        address: body.address?.trim() || "",
        city: body.city?.trim() || "",
        state: body.state?.trim() || "",
        pincode: body.pincode?.trim() || "",
        gstin: body.gstin?.trim() || "",
      },
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  const branch = await prisma.branch.findFirst({
    where: { id, orgId },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ branch });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "ORG_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstin?: string;
      isActive?: boolean;
    };

    const existing = await prisma.branch.findFirst({
      where: { id, orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    if (body.name && body.name.trim() !== existing.name) {
      const duplicate = await prisma.branch.findFirst({
        where: { orgId, name: body.name.trim(), id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A branch with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, string | boolean> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.address !== undefined) updateData.address = body.address.trim();
    if (body.city !== undefined) updateData.city = body.city.trim();
    if (body.state !== undefined) updateData.state = body.state.trim();
    if (body.pincode !== undefined) updateData.pincode = body.pincode.trim();
    if (body.gstin !== undefined) updateData.gstin = body.gstin.trim();
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const branch = await prisma.branch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ branch });
  } catch {
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "ORG_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.branch.findFirst({
    where: { id, orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const invoiceCount = await prisma.invoice.count({
    where: { branchId: id },
  });
  if (invoiceCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete branch with ${invoiceCount} invoice(s). Deactivate it instead.`,
      },
      { status: 409 }
    );
  }

  await prisma.branch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

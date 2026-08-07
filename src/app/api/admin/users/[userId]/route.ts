import { NextResponse } from "next/server";
import { requireSuperAdmin, HttpError } from "@/lib/admin";
import { prisma } from "@/lib/db";

// PATCH /api/admin/users/[userId] - Update user (super admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireSuperAdmin();
    const { userId } = await params;

    const { name, email, role, orgId } = await request.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(orgId !== undefined && { orgId }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orgId: true,
        org: { select: { name: true } },
      },
    });

    // Update TenantUser record if role or org changed
    if (role !== undefined || orgId !== undefined) {
      const targetOrgId = orgId ?? user.orgId;
      if (targetOrgId) {
        await prisma.tenantUser.upsert({
          where: {
            userId_orgId: { userId, orgId: targetOrgId },
          },
          update: { ...(role !== undefined && { role }) },
          create: {
            userId,
            orgId: targetOrgId,
            role: role || "VIEWER",
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[userId] - Delete user (super admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { session } = await requireSuperAdmin();
    const { userId } = await params;

    // Prevent deleting yourself
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete TenantUser records first
    await prisma.tenantUser.deleteMany({ where: { userId } });

    // Delete the user
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

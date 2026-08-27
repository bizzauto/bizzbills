import { NextResponse } from "next/server";
import { requireSuperAdmin, HttpError } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { validateAdminUserInput } from "@/lib/validation";

// GET /api/admin/users - List all users (super admin only)
export async function GET() {
  try {
    await requireSuperAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orgId: true,
        org: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new user (super admin only)
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const result = validateAdminUserInput(body);
    if (!result.ok || !result.value) {
      return NextResponse.json(
        { error: "Invalid input", details: result.errors },
        { status: 400 },
      );
    }
    const { email, password, name, role, orgId } = result.value;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // If an orgId was supplied, it must reference a real organization.
    if (orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 400 },
        );
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // If orgId provided, also create TenantUser record
    if (orgId) {
      await prisma.tenantUser.create({
        data: {
          userId: user.id,
          orgId,
          role: role || "VIEWER",
        },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin user create error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

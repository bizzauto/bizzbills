import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

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
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new user (super admin only)
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const { email, password, name, role, orgId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash,
        role: role || "VIEWER",
        orgId: orgId || null,
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
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Admin user create error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

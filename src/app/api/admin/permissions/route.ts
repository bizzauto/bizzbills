import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PERMISSIONS, getRolePermissions, setRolePermission } from "@/lib/permissions";

// ─── GET /api/admin/permissions ────────────────────────────────────────
// List all permissions for all roles in the caller's org.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true, role: true },
  });

  if (!user?.orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  // Only admins can view permissions
  if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = ["VIEWER", "ACCOUNTANT", "SALES_MANAGER", "ORG_ADMIN"];

  const result = await Promise.all(
    roles.map(async (role) => ({
      role,
      permissions: await getRolePermissions(user.orgId!, role),
    })),
  );

  return NextResponse.json({
    modules: PERMISSIONS,
    roles: result,
    currentRole: user.role,
  });
}

// ─── POST /api/admin/permissions ───────────────────────────────────────
// Update a permission: { role, permission, allowed }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true, role: true },
  });

  if (!user?.orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.role || !body?.permission || typeof body?.allowed !== "boolean") {
    return NextResponse.json(
      { error: "role, permission, and allowed (boolean) are required" },
      { status: 400 },
    );
  }

  const { role, permission, allowed } = body;

  // Validate role
  const validRoles = ["VIEWER", "ACCOUNTANT", "SALES_MANAGER", "ORG_ADMIN"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Validate permission string (module.action)
  const [module, action] = permission.split(".");
  const modulePerms = PERMISSIONS[module as keyof typeof PERMISSIONS];
  if (!modulePerms || !modulePerms.includes(action)) {
    return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
  }

  // Prevent modifying SUPER_ADMIN or ORG_ADMIN permissions
  if (role === "SUPER_ADMIN" || role === "ORG_ADMIN") {
    return NextResponse.json(
      { error: "Cannot modify admin role permissions" },
      { status: 400 },
    );
  }

  await setRolePermission(user.orgId, role, permission, allowed);

  return NextResponse.json({ success: true });
}

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Permission definitions ────────────────────────────────────────────
export const PERMISSIONS = {
  invoices: ["create", "view", "edit", "delete", "approve", "email"],
  payments: ["create", "view", "edit", "delete"],
  parties: ["create", "view", "edit", "delete"],
  products: ["create", "view", "edit", "delete"],
  orders: ["create", "view", "edit", "delete", "approve"],
  reports: ["view", "export"],
  settings: ["view", "edit"],
  users: ["view", "invite", "remove", "change-role"],
  accounting: ["view", "edit"],
  inventory: ["view", "edit"],
} as const;

export type PermissionModule = keyof typeof PERMISSIONS;
export type Permission = `${PermissionModule}.${string}`;

// ─── Default permissions per role ──────────────────────────────────────
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: Object.entries(PERMISSIONS).flatMap(([mod, acts]) =>
    acts.map((a) => `${mod}.${a}`),
  ),
  ORG_ADMIN: Object.entries(PERMISSIONS).flatMap(([mod, acts]) =>
    acts.map((a) => `${mod}.${a}`),
  ),
  ACCOUNTANT: [
    "invoices.create", "invoices.view", "invoices.edit", "invoices.email",
    "payments.create", "payments.view", "payments.edit",
    "parties.view", "parties.create", "parties.edit",
    "products.view",
    "orders.view",
    "reports.view", "reports.export",
    "settings.view",
    "accounting.view", "accounting.edit",
    "inventory.view", "inventory.edit",
  ],
  SALES_MANAGER: [
    "invoices.create", "invoices.view", "invoices.edit", "invoices.approve", "invoices.email",
    "payments.view",
    "parties.create", "parties.view", "parties.edit",
    "products.view",
    "orders.create", "orders.view", "orders.edit", "orders.approve",
    "reports.view",
    "settings.view",
    "inventory.view",
  ],
  VIEWER: [
    "invoices.view",
    "payments.view",
    "parties.view",
    "products.view",
    "orders.view",
    "reports.view",
    "accounting.view",
    "inventory.view",
  ],
};

// ─── Admin roles that bypass permission checks ─────────────────────────
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN"]);

// ─── Public helpers ────────────────────────────────────────────────────

/**
 * Check whether the current session user has a specific permission.
 * SUPER_ADMIN and ORG_ADMIN always return true.
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, orgId: true },
  });

  if (!user) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  if (!user.orgId) return false;

  const record = await prisma.rolePermission.findUnique({
    where: {
      orgId_role_permission: {
        orgId: user.orgId,
        role: user.role,
        permission,
      },
    },
    select: { allowed: true },
  });

  // If no explicit record, fall back to default permission set
  if (!record) {
    const defaults = DEFAULT_PERMISSIONS[user.role] ?? [];
    return defaults.includes(permission);
  }

  return record.allowed;
}

/**
 * Get all permissions (with allowed flag) for a role in an org.
 * Returns the merged view of DB overrides + defaults.
 */
export async function getRolePermissions(
  orgId: string,
  role: string,
): Promise<Array<{ permission: string; allowed: boolean }>> {
  const allPermissions = Object.entries(PERMISSIONS).flatMap(([mod, acts]) =>
    acts.map((a) => `${mod}.${a}`),
  );

  const stored = await prisma.rolePermission.findMany({
    where: { orgId, role },
    select: { permission: true, allowed: true },
  });

  const storedMap = new Map(stored.map((r) => [r.permission, r.allowed]));
  const defaults = DEFAULT_PERMISSIONS[role] ?? [];

  return allPermissions.map((perm) => ({
    permission: perm,
    allowed: storedMap.has(perm) ? storedMap.get(perm)! : defaults.includes(perm),
  }));
}

/**
 * Set (upsert) a single permission for a role in an org.
 */
export async function setRolePermission(
  orgId: string,
  role: string,
  permission: string,
  allowed: boolean,
): Promise<void> {
  await prisma.rolePermission.upsert({
    where: {
      orgId_role_permission: { orgId, role, permission },
    },
    create: { orgId, role, permission, allowed },
    update: { allowed },
  });
}

/**
 * Get the current user's role string (e.g. "ACCOUNTANT").
 * Returns null if no session.
 */
export async function getCurrentUserRole(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role ?? null;
}

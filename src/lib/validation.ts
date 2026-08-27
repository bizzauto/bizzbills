/**
 * Shared input validation for administrative and public API boundaries.
 * Keeps untrusted request bodies from reaching Prisma with garbage values.
 * No external dependencies — plain functions returning typed results.
 */

export const USER_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "ACCOUNTANT", "SALES_MANAGER", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AdminUserInput {
  email: unknown;
  password: unknown;
  name?: unknown;
  role?: unknown;
  orgId?: unknown;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value?: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    orgId: string | null;
  };
}

/**
 * Validate the body of POST /api/admin/users.
 * Returns ok:false with a list of human-readable errors when invalid.
 */
export function validateAdminUserInput(body: AdminUserInput): ValidationResult {
  const errors: string[] = [];

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    errors.push("Email is required");
  } else if (!EMAIL_RE.test(email)) {
    errors.push("Email is not a valid address");
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    errors.push("Password is required");
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : email.split("@")[0];

  const role = typeof body.role === "string" ? body.role : "VIEWER";
  if (!USER_ROLES.includes(role as UserRole)) {
    errors.push(`Role must be one of: ${USER_ROLES.join(", ")}`);
  }

  // orgId is optional; when provided it must be a non-empty string (existence
  // checked by the caller against the database).
  let orgId: string | null = null;
  if (body.orgId !== undefined && body.orgId !== null && body.orgId !== "") {
    if (typeof body.orgId !== "string") {
      errors.push("orgId must be a string");
    } else {
      orgId = body.orgId;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    value: {
      email,
      password,
      name,
      role: role as UserRole,
      orgId,
    },
  };
}

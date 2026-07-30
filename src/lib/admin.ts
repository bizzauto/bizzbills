import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Require super admin access. Returns the session and user if authorized.
 * Throws if not authenticated or not a super admin.
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  return { session, user };
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getSessionOrgId(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } });
  return user?.orgId;
}

export async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { orgId: true } });
  return { orgId: user?.orgId, userId: session.user.id };
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/billinvoice";
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// Always create PrismaClient on the server. In the browser this file should never be imported.
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "file:./dev.db";

  if (url.startsWith("file:")) {
    // SQLite — use @prisma/adapter-libsql
    const adapter = new PrismaLibSql({ url });
    return new PrismaClient({ adapter });
  }

  // PostgreSQL — use @prisma/adapter-pg
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// Lazy initialization: only create the Prisma client when it is actually
// accessed. This prevents adapter/provider mismatches during `next build`
// when DATABASE_URL may point to a different provider than the schema.
export const prisma =
  globalForPrisma.prisma ??
  (typeof window === "undefined" ? createPrismaClient() : undefined);

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}
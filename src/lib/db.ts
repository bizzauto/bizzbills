import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env or Coolify environment variables.\n" +
      "SQLite (local): file:./dev.db\n" +
      "Supabase/PostgreSQL: postgresql://user:password@host:5432/database?schema=public",
    );
  }

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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

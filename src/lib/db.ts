import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env or Coolify environment variables.\n" +
      "Local (sqlite/libsql): file:./dev.db\n" +
      "Supabase: postgresql://user:password@host:5432/database?schema=public",
    );
  }

  const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");
  const adapter = isPostgres
    ? new PrismaPg({ connectionString: url })
    : new PrismaLibSql({ url });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

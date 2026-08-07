import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  schemaSynced: boolean | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/billinvoice";
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// NOTE: Schema sync was removed — `prisma db push` via execSync on every import
// caused out-of-memory crashes during dev (HMR re-imports this module repeatedly,
// each time spawning a child process that never gets cleaned up).
// Instead, run `npx prisma db push` manually when you change the schema.

// Always create PrismaClient on the server
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

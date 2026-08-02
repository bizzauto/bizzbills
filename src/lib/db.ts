import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { execSync } from "child_process";
import { existsSync } from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  schemaSynced: boolean | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/billinvoice";
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// Auto-sync database schema on first request (adds missing columns without data loss)
function syncSchema() {
  if (globalForPrisma.schemaSynced) return;

  const cwd = process.cwd();

  // Find the prisma binary using absolute paths
  const candidates = [
    `${cwd}/node_modules/.bin/prisma`,
    `${cwd}/node_modules/prisma/build/index.js`,
  ];
  const prismaBin = candidates.find((p) => existsSync(p));
  if (!prismaBin) {
    console.warn("⚠️ Prisma CLI not found — schema sync skipped");
    globalForPrisma.schemaSynced = true;
    return;
  }

  try {
    const cmd = prismaBin.endsWith(".js")
      ? `node "${prismaBin}" db push --accept-data-loss --skip-generate`
      : `"${prismaBin}" db push --accept-data-loss --skip-generate`;
    execSync(cmd, { stdio: "pipe", timeout: 60000, cwd });
    globalForPrisma.schemaSynced = true;
    // Schema synced successfully
  } catch (e) {
    console.warn("⚠️ Schema sync failed:", (e as Error).message?.split("\n")[0]);
    globalForPrisma.schemaSynced = true; // Don't retry
  }
}

// Sync schema once on server start (dev only — production schema pushed at deploy time)
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  syncSchema();
}

// Always create PrismaClient on the server
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

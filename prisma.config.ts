import { defineConfig } from "@prisma/config";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  earlyAccess: true,
  migrate: {
    adapter: (datasourceUrl: string) => {
      const libsql = createClient({ url: datasourceUrl });
      return new PrismaLibSql(libsql);
    },
  },
  datasourceUrl: process.env.DATABASE_URL || "file:./dev.db",
});

import { defineConfig } from "@prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  migrate: {
    adapter: (datasourceUrl: string) => {
      return new PrismaLibSql({ url: datasourceUrl });
    },
  },
  datasourceUrl: process.env.DATABASE_URL || "file:./dev.db",
});

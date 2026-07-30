import { defineConfig } from "@prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  migrate: {
    adapter: (datasourceUrl: string) => {
      return new PrismaPg({ connectionString: datasourceUrl });
    },
  },
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/billinvoice",
});

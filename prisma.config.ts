import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Runtime queries use the pooled DATABASE_URL in src/lib/db.ts. Prisma CLI
    // operations prefer Neon's direct URL so migrations do not run through a pooler.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@placeholder.neon.tech/neondb?sslmode=require",
  },
});

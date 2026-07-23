import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const mode = process.argv[2] === "migration" ? "migration" : "runtime";

const neonUrlSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "postgresql:" && url.hostname.endsWith(".neon.tech")
      );
    } catch {
      return false;
    }
  });

const requiredVariables =
  mode === "migration"
    ? {
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
      }
    : {
        DATABASE_URL: process.env.DATABASE_URL,
      };

const result = z
  .object(
    Object.fromEntries(
      Object.keys(requiredVariables).map((name) => [name, neonUrlSchema]),
    ),
  )
  .safeParse(requiredVariables);

if (!result.success) {
  const names = result.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  console.error(
    `Neon configuration required: ${names || "database URL"} must be a postgresql:// connection on *.neon.tech.`,
  );
  console.error(
    "Create .env.local from .env.example and add your rotated Neon connection strings. .env.local overrides .env.",
  );
  process.exit(1);
}

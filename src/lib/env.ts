import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  AUTH_SECRET: z.string().min(32),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  ADMIN_GITHUB_LOGIN: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    ADMIN_GITHUB_LOGIN: process.env.ADMIN_GITHUB_LOGIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

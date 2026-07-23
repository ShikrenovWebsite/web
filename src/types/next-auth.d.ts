import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      githubLogin: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin: boolean;
    githubLogin: string | null;
  }
}

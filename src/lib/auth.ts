import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions, Profile } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

type GitHubProfile = Profile & {
  id: number;
  login: string;
  avatar_url?: string | null;
};

function isGitHubProfile(profile: Profile | undefined): profile is GitHubProfile {
  const candidate = profile as Partial<GitHubProfile> | undefined;

  return (
    typeof candidate?.id === "number" &&
    typeof candidate.login === "string"
  );
}

const env = getServerEnv();
const approvedLogin = env.ADMIN_GITHUB_LOGIN.toLowerCase();
const isDevelopment = process.env.NODE_ENV === "development";

type OwnerResolution = {
  id: string | null;
  isAdmin: boolean | null;
};

function logAuthDiagnostic(
  stage: string,
  details: {
    authenticatedGitHubLogin: string | null;
    configuredAdminLogin: string;
    loginMatches: boolean;
    databaseUserId: string | null;
    databaseIsAdmin: boolean | null;
    sessionCreated: boolean;
  },
) {
  if (!isDevelopment) {
    return;
  }

  console.info(`[auth:${stage}]`, details);
}

function accountData(account: {
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}) {
  return {
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refresh_token: account.refresh_token ?? null,
    access_token: account.access_token ?? null,
    expires_at: account.expires_at ?? null,
    token_type: account.token_type ?? null,
    scope: account.scope ?? null,
    id_token: account.id_token ?? null,
    session_state: account.session_state ?? null,
  };
}

async function getLinkedUser(
  provider: string,
  providerAccountId: string,
): Promise<OwnerResolution> {
  const linkedAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          isAdmin: true,
        },
      },
    },
  });

  return linkedAccount?.user ?? { id: null, isAdmin: null };
}

async function persistApprovedOwner(
  profile: GitHubProfile,
  account: {
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token?: string;
    access_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    session_state?: string;
  },
): Promise<OwnerResolution> {
  return db.$transaction(async (transaction) => {
    const [configuredOwner, linkedAccount, emailUser] = await Promise.all([
      transaction.user.findFirst({
        where: {
          githubLogin: {
            equals: profile.login,
            mode: "insensitive",
          },
        },
      }),
      transaction.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        include: { user: true },
      }),
      profile.email
        ? transaction.user.findUnique({ where: { email: profile.email } })
        : null,
    ]);

    const existingOwner =
      configuredOwner ?? linkedAccount?.user ?? emailUser ?? null;

    const owner = existingOwner
      ? await transaction.user.update({
          where: { id: existingOwner.id },
          data: {
            githubLogin: profile.login,
            isAdmin: true,
            name: existingOwner.name ?? profile.name ?? profile.login,
            image: existingOwner.image ?? profile.avatar_url ?? null,
          },
        })
      : await transaction.user.create({
          data: {
            name: profile.name ?? profile.login,
            email: profile.email ?? null,
            image: profile.avatar_url ?? null,
            githubLogin: profile.login,
            isAdmin: true,
          },
        });

    if (linkedAccount && linkedAccount.userId !== owner.id) {
      // Invalidate sessions for the duplicate OAuth shell before moving the
      // account. Auth.js will create a fresh database session for the owner.
      await transaction.session.deleteMany({
        where: { userId: linkedAccount.userId },
      });
    }

    await transaction.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      update: {
        ...accountData(account),
        userId: owner.id,
      },
      create: {
        ...accountData(account),
        userId: owner.id,
      },
    });

    return {
      id: owner.id,
      isAdmin: owner.isAdmin,
    };
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  secret: env.AUTH_SECRET,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/access-denied",
  },
  providers: [
    GitHubProvider({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email read:org",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "github" || !isGitHubProfile(profile)) {
        logAuthDiagnostic("sign-in", {
          authenticatedGitHubLogin: null,
          configuredAdminLogin: env.ADMIN_GITHUB_LOGIN,
          loginMatches: false,
          databaseUserId: null,
          databaseIsAdmin: null,
          sessionCreated: false,
        });
        return false;
      }

      const loginMatches = profile.login.toLowerCase() === approvedLogin;

      const databaseUser = loginMatches
        ? await persistApprovedOwner(profile, account)
        : await getLinkedUser(account.provider, account.providerAccountId);

      logAuthDiagnostic("sign-in", {
        authenticatedGitHubLogin: profile.login,
        configuredAdminLogin: env.ADMIN_GITHUB_LOGIN,
        loginMatches,
        databaseUserId: databaseUser.id,
        databaseIsAdmin: databaseUser.isAdmin,
        sessionCreated: false,
      });

      return loginMatches;
    },
    async session({ session, user }) {
      const databaseUser = await db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          isAdmin: true,
          githubLogin: true,
        },
      });

      if (session.user) {
        session.user.id = databaseUser?.id ?? user.id;
        session.user.isAdmin = databaseUser?.isAdmin ?? false;
        session.user.githubLogin = databaseUser?.githubLogin ?? null;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "github") {
        return;
      }

      const [databaseUser, sessionCount] = await Promise.all([
        db.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            githubLogin: true,
            isAdmin: true,
          },
        }),
        db.session.count({ where: { userId: user.id } }),
      ]);

      logAuthDiagnostic("session", {
        authenticatedGitHubLogin: databaseUser?.githubLogin ?? null,
        configuredAdminLogin: env.ADMIN_GITHUB_LOGIN,
        loginMatches:
          databaseUser?.githubLogin?.toLowerCase() === approvedLogin,
        databaseUserId: databaseUser?.id ?? null,
        databaseIsAdmin: databaseUser?.isAdmin ?? null,
        sessionCreated: sessionCount > 0,
      });
    },
  },
};

async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const databaseUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      githubLogin: true,
      isAdmin: true,
    },
  });

  if (!databaseUser) {
    return null;
  }

  return {
    ...session,
    user: {
      ...session.user,
      id: databaseUser.id,
      isAdmin: databaseUser.isAdmin,
      githubLogin: databaseUser.githubLogin,
    },
    databaseUser,
  };
}

export async function getAdminSession() {
  const session = await getAuthenticatedSession();

  if (!session?.databaseUser.isAdmin) {
    return null;
  }

  const { databaseUser, ...authenticatedSession } = session;

  return {
    ...authenticatedSession,
    admin: databaseUser,
  };
}

export async function requireAdminPage(callbackUrl = "/admin") {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect(
      `/auth/sign-in?callbackUrl=${encodeURIComponent(
        getSafeAdminCallbackUrl(callbackUrl),
      )}`,
    );
  }

  if (!session.databaseUser.isAdmin) {
    redirect("/auth/access-denied?error=AccessDenied");
  }

  const { databaseUser, ...authenticatedSession } = session;

  return {
    ...authenticatedSession,
    admin: databaseUser,
  };
}

export async function requireAdminApi() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return {
      authorized: false as const,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!session.databaseUser.isAdmin) {
    return {
      authorized: false as const,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const { databaseUser, ...authenticatedSession } = session;

  return {
    authorized: true as const,
    session: {
      ...authenticatedSession,
      admin: databaseUser,
    },
  };
}

export function getSafeAdminCallbackUrl(
  callbackUrl: string | null | undefined,
) {
  if (
    callbackUrl &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//")
  ) {
    return callbackUrl;
  }

  if (callbackUrl) {
    try {
      const requestedUrl = new URL(callbackUrl);
      const configuredUrl = new URL(env.NEXTAUTH_URL);

      if (requestedUrl.origin === configuredUrl.origin) {
        return `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
      }
    } catch {
      // Invalid or external callback URLs fall through to the admin default.
    }
  }

  return "/admin";
}

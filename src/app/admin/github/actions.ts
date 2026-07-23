"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/auth";
import { createGitHubClient, GitHubApiError } from "@/lib/github/client";
import {
  auditGitHubRepositorySource,
  synchronizeGitHubRepositories,
} from "@/lib/github/sync";
import {
  decryptGitHubToken,
  encryptGitHubToken,
} from "@/lib/github/token";
import {
  hasRequiredGitHubScopes,
  parseGitHubScopes,
} from "@/lib/github/scopes";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  githubProjectFieldSchema,
  githubAccessTestSchema,
  organizationOwnerPreferenceSchema,
  repositoryIdSchema,
  repositoryReviewSchema,
  unavailableRepositoryActionSchema,
} from "@/lib/validations/github";

export type GitHubActionResult = {
  success: boolean;
  message: string;
  summary?: {
    seen: number;
    personalRepositoriesFound: number;
    organizationsDiscovered: number;
    organizationRepositoriesFound: number;
    organizationsSynchronized: number;
    organizationsSkipped: number;
    organizationsRequiringApproval: number;
    partialFailures: number;
    discovered: number;
    changed: number;
    unchanged: number;
    unavailable: number;
    warnings: number;
  };
  diagnostics?: {
    authenticatedGitHubLogin: string;
    grantedScopes: string[];
    requestedScopes: string[];
    organizationsReturned: string[];
    organizationRepositoryEndpoint: string;
    organizationRepositoryStatus: number;
    organizationRepositoryCount: number;
    userRepositoryCount: number;
    targetRepositoryStatus: number;
    targetRepositoryFoundInOrganization: boolean;
    targetRepositoryFoundInUserRepositories: boolean;
    targetRepositoryEligible: boolean;
    targetRepositoryExclusionReasons: string[];
    organizationApprovalState: string;
  };
};

function revalidateGitHub() {
  revalidatePath("/admin");
  revalidatePath("/admin/github");
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

function messageFromError(error: unknown) {
  if (error instanceof GitHubApiError) {
    return error.message;
  }

  if (
    error instanceof Error &&
    !error.name.startsWith("Prisma") &&
    !error.message.includes("Invalid `")
  ) {
    return error.message;
  }

  return "The GitHub operation failed. Check the server log for details.";
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

export async function connectGitHubAccount(): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");

  try {
    const account = await db.account.findFirst({
      where: {
        userId: admin.id,
        provider: "github",
      },
      select: {
        access_token: true,
        scope: true,
      },
    });

    if (!account?.access_token) {
      return {
        success: false,
        message:
          "No reusable GitHub OAuth token was found. Sign out and authenticate with GitHub again.",
      };
    }

    const client = createGitHubClient(account.access_token);
    const githubUser = await client.getAuthenticatedUser();
    const configuredLogin = getServerEnv().ADMIN_GITHUB_LOGIN;
    const scopes = parseGitHubScopes(account.scope);

    if (githubUser.login.toLowerCase() !== configuredLogin.toLowerCase()) {
      return {
        success: false,
        message: "The authenticated GitHub account is not the configured owner.",
      };
    }

    if (!hasRequiredGitHubScopes(scopes)) {
      return {
        success: false,
        message:
          "Reconnect GitHub and grant read:org before updating the stored synchronization token.",
      };
    }

    await db.gitHubConnection.upsert({
      where: { userId: admin.id },
      update: {
        githubUserId: String(githubUser.id),
        githubLogin: githubUser.login,
        encryptedAccessToken: encryptGitHubToken(account.access_token),
        tokenKeyVersion: 1,
        scopes,
        isActive: true,
      },
      create: {
        userId: admin.id,
        githubUserId: String(githubUser.id),
        githubLogin: githubUser.login,
        encryptedAccessToken: encryptGitHubToken(account.access_token),
        tokenKeyVersion: 1,
        scopes,
      },
    });

    revalidateGitHub();
    return {
      success: true,
      message: `Connected GitHub account @${githubUser.login}.`,
    };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function setOrganizationSyncPreference(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  const parsed = organizationOwnerPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid organization preference." };
  }

  const result = await db.gitHubOwner.updateMany({
    where: {
      id: parsed.data.ownerId,
      type: "ORGANIZATION",
      connection: { userId: admin.id },
    },
    data: {
      preference: parsed.data.preference,
      syncEnabled: parsed.data.preference === "ENABLED",
    },
  });

  if (!result.count) {
    return { success: false, message: "Organization not found." };
  }

  revalidateGitHub();
  return {
    success: true,
    message:
      parsed.data.preference === "ENABLED"
        ? "Organization synchronization enabled."
        : parsed.data.preference === "IGNORED"
          ? "Organization ignored. Existing records and projects were preserved."
          : "Organization returned to pending review.",
  };
}

export async function testGitHubOrganizationAccess(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  if (process.env.NODE_ENV !== "development") {
    return {
      success: false,
      message: "Detailed GitHub access testing is available in development only.",
    };
  }

  const parsed = githubAccessTestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid GitHub access test.",
    };
  }

  const connection = await db.gitHubConnection.findFirst({
    where: { userId: admin.id, isActive: true },
  });
  if (!connection) {
    return { success: false, message: "Connect GitHub before testing access." };
  }

  try {
    const client = createGitHubClient(
      decryptGitHubToken(connection.encryptedAccessToken),
    );
    const [
      authenticatedUser,
      organizationDiscovery,
      userRepositories,
      organization,
      organizationRepositories,
      directRepository,
    ] = await Promise.all([
      client.getAuthenticatedUser(),
      client.listOrganizationsWithDiagnostics(),
      client.listAccessiblePublicRepositoriesWithDiagnostics(),
      client.getOrganizationWithDiagnostics(parsed.data.organizationLogin),
      client.listOrganizationRepositoriesWithDiagnostics(
        parsed.data.organizationLogin,
      ),
      client.getRepositoryWithDiagnostics(
        parsed.data.organizationLogin,
        parsed.data.repositoryName,
      ),
    ]);

    let organizationApprovalState = "APPROVED_OR_NOT_RESTRICTED";
    let membershipWarning: string | null = null;
    try {
      await client.getOrganizationMembershipWithDiagnostics(
        parsed.data.organizationLogin,
      );
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 403) {
        organizationApprovalState = "OAUTH_APP_ACCESS_RESTRICTED";
        membershipWarning = error.message;
      } else {
        organizationApprovalState = "MEMBERSHIP_UNAVAILABLE";
        membershipWarning =
          error instanceof Error
            ? error.message
            : "Organization membership could not be inspected.";
      }
    }

    const targetAudit = auditGitHubRepositorySource(
      directRepository.repository,
      connection,
    );
    const organizationFullNames = organizationRepositories.items.map(
      (repository) => repository.full_name,
    );
    const userFullNames = userRepositories.items.map(
      (repository) => repository.full_name,
    );
    const now = new Date();
    const diagnosticData = {
      authenticatedGitHubLogin: authenticatedUser.login,
      requestedScopes: ["read:user", "user:email", "read:org"],
      grantedScopes: organizationRepositories.diagnostics.grantedScopes,
      organizationsReturned: organizationDiscovery.items.map(
        (item) => item.login,
      ),
      organizationDiscovery: organizationDiscovery.diagnostics,
      authenticatedUserRepositoryListing: userRepositories.diagnostics,
      organizationRepositoryListing: organizationRepositories.diagnostics,
      directRepository: directRepository.diagnostics,
      organizationApprovalState,
      membershipWarning,
      fullNames: organizationFullNames,
      target: targetAudit,
    };

    await db.gitHubOwner.upsert({
      where: {
        connectionId_githubOwnerId: {
          connectionId: connection.id,
          githubOwnerId: String(organization.organization.id),
        },
      },
      update: {
        login: organization.organization.login,
        type: "ORGANIZATION",
        avatarUrl: organization.organization.avatar_url ?? null,
        accessStatus: "ACCESSIBLE",
        accessMessage: membershipWarning
          ? "Public repositories are accessible, but GitHub reports that organization membership data is restricted until this OAuth app is approved."
          : null,
        lastApiStatus: organizationRepositories.diagnostics.status,
        rawRepositoryCount: organizationRepositories.items.length,
        eligibleRepositoryCount: organizationRepositories.items.filter(
          (repository) =>
            auditGitHubRepositorySource(repository, connection).eligible,
        ).length,
        diagnosticData,
        lastDiscoveredAt: now,
        lastSuccessfulSyncAt: now,
      },
      create: {
        connectionId: connection.id,
        githubOwnerId: String(organization.organization.id),
        login: organization.organization.login,
        type: "ORGANIZATION",
        avatarUrl: organization.organization.avatar_url ?? null,
        preference: "PENDING",
        syncEnabled: false,
        accessStatus: "ACCESSIBLE",
        accessMessage: membershipWarning
          ? "Public repositories are accessible, but GitHub reports that organization membership data is restricted until this OAuth app is approved."
          : null,
        lastApiStatus: organizationRepositories.diagnostics.status,
        rawRepositoryCount: organizationRepositories.items.length,
        eligibleRepositoryCount: organizationRepositories.items.filter(
          (repository) =>
            auditGitHubRepositorySource(repository, connection).eligible,
        ).length,
        diagnosticData,
        lastDiscoveredAt: now,
        lastSuccessfulSyncAt: now,
      },
    });

    revalidateGitHub();
    return {
      success: true,
      message: targetAudit.eligible
        ? `${targetAudit.fullName} is accessible and eligible. Run Sync GitHub to import it for review.`
        : `${targetAudit.fullName} is accessible but excluded by the current filters.`,
      diagnostics: {
        authenticatedGitHubLogin: authenticatedUser.login,
        grantedScopes: organizationRepositories.diagnostics.grantedScopes,
        requestedScopes: ["read:user", "user:email", "read:org"],
        organizationsReturned: organizationDiscovery.items.map(
          (item) => item.login,
        ),
        organizationRepositoryEndpoint:
          organizationRepositories.diagnostics.endpoint,
        organizationRepositoryStatus:
          organizationRepositories.diagnostics.status,
        organizationRepositoryCount: organizationRepositories.items.length,
        userRepositoryCount: userRepositories.items.length,
        targetRepositoryStatus: directRepository.diagnostics.status,
        targetRepositoryFoundInOrganization: organizationFullNames.some(
          (fullName) =>
            fullName.toLowerCase() === targetAudit.fullName.toLowerCase(),
        ),
        targetRepositoryFoundInUserRepositories: userFullNames.some(
          (fullName) =>
            fullName.toLowerCase() === targetAudit.fullName.toLowerCase(),
        ),
        targetRepositoryEligible: targetAudit.eligible,
        targetRepositoryExclusionReasons: targetAudit.exclusionReasons,
        organizationApprovalState,
      },
    };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function syncGitHub(): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");

  try {
    const summary = await synchronizeGitHubRepositories(admin.id);
    revalidateGitHub();
    return {
      success: true,
      message:
        summary.warnings > 0
          ? `Sync completed with ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}.`
          : "GitHub synchronization completed.",
      summary,
    };
  } catch (error) {
    revalidateGitHub();
    return { success: false, message: messageFromError(error) };
  }
}

export async function setRepositoryReviewStatus(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  const parsed = repositoryReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid repository review request." };
  }

  const result = await db.gitHubRepository.updateMany({
    where: {
      id: parsed.data.repositoryId,
      connection: { userId: admin.id },
    },
    data: {
      status: parsed.data.status,
    },
  });

  if (!result.count) {
    return { success: false, message: "Repository not found." };
  }

  revalidateGitHub();
  return {
    success: true,
    message:
      parsed.data.status === "IGNORED"
        ? "Repository ignored. It will remain ignored after future syncs."
        : "Repository moved back to pending review.",
  };
}

export async function addRepositoryToPortfolio(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  const parsed = repositoryIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid repository." };
  }

  try {
    const result = await db.$transaction(async (transaction) => {
      const repository = await transaction.gitHubRepository.findFirst({
        where: {
          id: parsed.data.repositoryId,
          connection: { userId: admin.id },
        },
        include: { project: true },
      });

      if (!repository) throw new Error("Repository not found.");
      if (repository.unavailableAt) {
        throw new Error("Unavailable repositories cannot be added until they return.");
      }

      if (repository.project) {
        if (repository.status !== "ACCEPTED") {
          await transaction.gitHubRepository.update({
            where: { id: repository.id },
            data: { status: "ACCEPTED" },
          });
        }
        return { created: false };
      }

      const rootSlug = slugify(repository.name);
      let slug = rootSlug;
      let suffix = 2;
      while (
        await transaction.portfolioProject.findFirst({
          where: { userId: admin.id, slug },
          select: { id: true },
        })
      ) {
        slug = `${rootSlug}-${suffix}`;
        suffix += 1;
      }

      const lastProject = await transaction.portfolioProject.findFirst({
        where: { userId: admin.id },
        orderBy: { displayOrder: "desc" },
        select: { displayOrder: true },
      });
      const technologies = [
        repository.primaryLanguage,
        ...repository.topics,
      ].filter((value): value is string => Boolean(value));

      await transaction.portfolioProject.create({
        data: {
          userId: admin.id,
          githubRepositoryId: repository.id,
          title: repository.name,
          slug,
          shortDescription: repository.description,
          longDescription: repository.readmePreview,
          technologies: [...new Set(technologies)],
          liveUrl: repository.homepageUrl,
          sourceCodeUrl: repository.githubUrl,
          sourceType: "GITHUB",
          sourceReferenceId: repository.githubRepositoryId,
          status: "DRAFT",
          featured: false,
          displayOrder: (lastProject?.displayOrder ?? -1) + 1,
        },
      });
      await transaction.gitHubRepository.update({
        where: { id: repository.id },
        data: { status: "ACCEPTED" },
      });

      return { created: true };
    });

    revalidateGitHub();
    return {
      success: true,
      message: result.created
        ? "Draft project created. Review it before publishing."
        : "This repository is already linked to a portfolio project.",
    };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function applyGitHubProjectField(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  const parsed = githubProjectFieldSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid GitHub field update." };
  }

  const repository = await db.gitHubRepository.findFirst({
    where: {
      id: parsed.data.repositoryId,
      connection: { userId: admin.id },
    },
    include: { project: true },
  });

  if (!repository?.project) {
    return { success: false, message: "Linked portfolio project not found." };
  }

  const technologies = [
    repository.primaryLanguage,
    ...repository.topics,
  ].filter((value): value is string => Boolean(value));
  const values = {
    title: repository.name,
    shortDescription: repository.description,
    longDescription: repository.readmePreview,
    technologies: [...new Set(technologies)],
    liveUrl: repository.homepageUrl,
    sourceCodeUrl: repository.githubUrl,
  };

  await db.portfolioProject.update({
    where: { id: repository.project.id },
    data: {
      [parsed.data.field]: values[parsed.data.field],
    },
  });

  revalidateGitHub();
  return {
    success: true,
    message: "GitHub value applied. Publication settings were unchanged.",
  };
}

export async function finishRepositoryChangeReview(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  const parsed = repositoryIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid repository." };
  }

  const repository = await db.gitHubRepository.findFirst({
    where: {
      id: parsed.data.repositoryId,
      connection: { userId: admin.id },
    },
    select: { id: true },
  });
  if (!repository) return { success: false, message: "Repository not found." };

  await db.gitHubSyncItem.updateMany({
    where: {
      repositoryId: repository.id,
      changeType: "UPDATED",
      reviewedAt: null,
    },
    data: { reviewedAt: new Date() },
  });

  revalidateGitHub();
  return {
    success: true,
    message: "Changes reviewed. Unapplied values keep the portfolio version.",
  };
}

export async function handleUnavailableRepository(
  input: unknown,
): Promise<GitHubActionResult> {
  const { admin } = await requireAdminPage("/admin/github");
  const parsed = unavailableRepositoryActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid unavailable repository action." };
  }

  try {
    await db.$transaction(async (transaction) => {
      const repository = await transaction.gitHubRepository.findFirst({
        where: {
          id: parsed.data.repositoryId,
          connection: { userId: admin.id },
        },
        include: { project: true },
      });
      if (!repository) throw new Error("Repository not found.");

      if (repository.project && parsed.data.action === "UNPUBLISH") {
        await transaction.portfolioProject.update({
          where: { id: repository.project.id },
          data: { status: "DRAFT", publishedAt: null },
        });
      } else if (repository.project && parsed.data.action === "DISCONNECT") {
        await transaction.portfolioProject.update({
          where: { id: repository.project.id },
          data: { githubRepositoryId: null },
        });
        await transaction.gitHubRepository.update({
          where: { id: repository.id },
          data: { status: "REMOVED" },
        });
      } else if (repository.project && parsed.data.action === "REMOVE_PROJECT") {
        await transaction.portfolioProject.delete({
          where: { id: repository.project.id },
        });
        await transaction.gitHubRepository.update({
          where: { id: repository.id },
          data: { status: "REMOVED" },
        });
      }

      await transaction.gitHubSyncItem.updateMany({
        where: {
          repositoryId: repository.id,
          changeType: "UNAVAILABLE",
          reviewedAt: null,
        },
        data: { reviewedAt: new Date() },
      });
    });

    revalidateGitHub();
    return {
      success: true,
      message:
        parsed.data.action === "KEEP"
          ? "Portfolio project kept unchanged."
          : parsed.data.action === "UNPUBLISH"
            ? "Portfolio project moved to drafts."
            : parsed.data.action === "DISCONNECT"
              ? "Project disconnected from GitHub and kept as editable content."
              : "Portfolio project removed. The GitHub source record was retained.",
    };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

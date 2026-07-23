import { GitHubManager } from "@/components/admin/github-manager";
import { requireAdminPage } from "@/lib/auth";
import { formatAdminDateTime } from "@/lib/date";
import { db } from "@/lib/db";
import { parseGitHubScopes } from "@/lib/github/scopes";

export const metadata = { title: "GitHub synchronization" };
export const dynamic = "force-dynamic";

function readmeImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      typeof item !== "object" ||
      !item ||
      !("url" in item) ||
      typeof item.url !== "string"
    ) {
      return [];
    }
    return [
      {
        url: item.url,
        alt:
          "alt" in item && typeof item.alt === "string"
            ? item.alt
            : "Project image",
        source:
          "source" in item && typeof item.source === "string"
            ? item.source
            : "README",
      },
    ];
  });
}

function sourceFiles(value: unknown) {
  const files =
    typeof value === "object" &&
    value &&
    "files" in value &&
    Array.isArray(value.files)
      ? value.files
      : Array.isArray(value)
        ? value
        : [];
  return files.flatMap((item) => {
    if (
      typeof item !== "object" ||
      !item ||
      !("path" in item) ||
      typeof item.path !== "string"
    ) {
      return [];
    }
    return [item.path];
  });
}

function enrichmentCategories(value: unknown) {
  if (
    typeof value !== "object" ||
    !value ||
    !("categories" in value) ||
    typeof value.categories !== "object" ||
    !value.categories ||
    Array.isArray(value.categories)
  ) {
    return [];
  }

  return Object.entries(value.categories).flatMap(([label, technologies]) =>
    Array.isArray(technologies) &&
    technologies.every((technology) => typeof technology === "string") &&
    technologies.length
      ? [{ label, technologies }]
      : [],
  );
}

export default async function AdminGitHubPage() {
  const { admin } = await requireAdminPage("/admin/github");
  const [connection, oauthAccount] = await Promise.all([
    db.gitHubConnection.findFirst({
      where: { userId: admin.id, isActive: true },
      include: {
        owners: {
          orderBy: [{ type: "asc" }, { login: "asc" }],
        },
        repositories: {
          orderBy: [{ githubUpdatedAt: "desc" }, { fullName: "asc" }],
          include: {
            project: {
              select: {
                id: true,
                title: true,
                shortDescription: true,
                longDescription: true,
                technologies: true,
                liveUrl: true,
                sourceCodeUrl: true,
                coverImageUrl: true,
                status: true,
                featured: true,
                displayOrder: true,
              },
            },
            syncItems: {
              where: {
                changeType: { in: ["UPDATED", "UNAVAILABLE"] },
                reviewedAt: null,
              },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                changeType: true,
                fieldsChanged: true,
                createdAt: true,
              },
            },
          },
        },
        syncRuns: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            status: true,
            repositoriesSeen: true,
            personalRepositoriesFound: true,
            organizationsDiscovered: true,
            organizationRepositoriesFound: true,
            organizationsSynchronized: true,
            organizationsSkipped: true,
            organizationsRequiringApproval: true,
            partialFailureCount: true,
            newCount: true,
            changedCount: true,
            unchangedCount: true,
            unavailableCount: true,
            warningCount: true,
            rateLimitRemaining: true,
            rateLimitResetAt: true,
            errorMessage: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    }),
    db.account.findFirst({
      where: { userId: admin.id, provider: "github" },
      select: { scope: true },
    }),
  ]);

  return (
    <GitHubManager
      connection={
        connection
          ? {
              githubLogin: connection.githubLogin,
              scopes: connection.scopes,
              oauthScopes: parseGitHubScopes(oauthAccount?.scope ?? null),
              includeForks: connection.includeForks,
              includeArchived: connection.includeArchived,
              includeTemplates: connection.includeTemplates,
              lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
              lastSyncedAtLabel: formatAdminDateTime(connection.lastSyncedAt),
              latestRun: connection.syncRuns[0]
                ? {
                    ...connection.syncRuns[0],
                    startedAt: connection.syncRuns[0].startedAt.toISOString(),
                    startedAtLabel: formatAdminDateTime(
                      connection.syncRuns[0].startedAt,
                    ),
                    completedAt:
                      connection.syncRuns[0].completedAt?.toISOString() ?? null,
                    completedAtLabel: formatAdminDateTime(
                      connection.syncRuns[0].completedAt,
                    ),
                    rateLimitResetAt:
                      connection.syncRuns[0].rateLimitResetAt?.toISOString() ??
                      null,
                    rateLimitResetAtLabel: formatAdminDateTime(
                      connection.syncRuns[0].rateLimitResetAt,
                    ),
                  }
                : null,
              owners: connection.owners.map((owner) => ({
                id: owner.id,
                login: owner.login,
                type: owner.type,
                avatarUrl: owner.avatarUrl,
                preference: owner.preference,
                syncEnabled: owner.syncEnabled,
                accessStatus: owner.accessStatus,
                accessMessage: owner.accessMessage,
                lastApiStatus: owner.lastApiStatus,
                rawRepositoryCount: owner.rawRepositoryCount,
                eligibleRepositoryCount: owner.eligibleRepositoryCount,
                diagnosticData:
                  process.env.NODE_ENV === "development"
                    ? owner.diagnosticData
                    : null,
                lastDiscoveredAt:
                  owner.lastDiscoveredAt?.toISOString() ?? null,
                lastDiscoveredAtLabel: formatAdminDateTime(
                  owner.lastDiscoveredAt,
                ),
                lastSuccessfulSyncAt:
                  owner.lastSuccessfulSyncAt?.toISOString() ?? null,
                lastSuccessfulSyncAtLabel: formatAdminDateTime(
                  owner.lastSuccessfulSyncAt,
                ),
              })),
              repositories: connection.repositories.map((repository) => ({
                id: repository.id,
                name: repository.name,
                fullName: repository.fullName,
                ownerLogin: repository.ownerLogin,
                ownerType: repository.ownerType,
                ownerAvatarUrl: repository.ownerAvatarUrl,
                description: repository.description,
                githubUrl: repository.githubUrl,
                homepageUrl: repository.homepageUrl,
                primaryLanguage: repository.primaryLanguage,
                topics: repository.topics,
                starCount: repository.starCount,
                forkCount: repository.forkCount,
                visibility: repository.visibility,
                isArchived: repository.isArchived,
                isFork: repository.isFork,
                isTemplate: repository.isTemplate,
                defaultBranch: repository.defaultBranch,
                readmePreview: repository.readmePreview,
                readmeMarkdown: repository.readmeMarkdown,
                readmeImages: readmeImages(repository.readmeImages),
                sourceFiles: sourceFiles(repository.sourceFilesSnapshot),
                enrichmentCategories: enrichmentCategories(
                  repository.enrichmentSnapshot,
                ),
                enrichmentVersion: repository.enrichmentVersion,
                enrichmentError: repository.enrichmentError,
                detectedTechnologies: repository.detectedTechnologies,
                suggestedTitle: repository.suggestedTitle,
                suggestedShortDescription:
                  repository.suggestedShortDescription,
                suggestedLongDescription:
                  repository.suggestedLongDescription,
                suggestedCoverImageUrl:
                  repository.suggestedCoverImageUrl,
                enrichedAt: repository.enrichedAt?.toISOString() ?? null,
                enrichedAtLabel: formatAdminDateTime(
                  repository.enrichedAt,
                ),
                githubUpdatedAt:
                  repository.githubUpdatedAt?.toISOString() ?? null,
                githubUpdatedAtLabel: formatAdminDateTime(
                  repository.githubUpdatedAt,
                ),
                githubPushedAt:
                  repository.githubPushedAt?.toISOString() ?? null,
                githubPushedAtLabel: formatAdminDateTime(
                  repository.githubPushedAt,
                ),
                lastSuccessfulSyncAt:
                  repository.lastSuccessfulSyncAt?.toISOString() ?? null,
                lastSuccessfulSyncAtLabel: formatAdminDateTime(
                  repository.lastSuccessfulSyncAt,
                ),
                unavailableAt:
                  repository.unavailableAt?.toISOString() ?? null,
                unavailableReason: repository.unavailableReason,
                status: repository.status,
                project: repository.project,
                pendingChanges: repository.syncItems
                  .filter((item) => item.changeType === "UPDATED")
                  .flatMap((item) => item.fieldsChanged),
                hasUnavailableReview: repository.syncItems.some(
                  (item) => item.changeType === "UNAVAILABLE",
                ),
              })),
            }
          : null
      }
    />
  );
}

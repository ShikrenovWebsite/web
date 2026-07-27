import "server-only";

import { Prisma, type GitHubRepository } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  createGitHubClient,
  GitHubApiError,
  type GitHubListDiagnostics,
  type GitHubRepositorySource,
} from "@/lib/github/client";
import {
  discoverOrganizationCandidates,
  mergeRepositoriesByGithubId,
  type GitHubOwnerPreference,
} from "@/lib/github/owners";
import {
  analyzeRepositoryContents,
  GITHUB_ENRICHMENT_VERSION,
} from "@/lib/github/enrichment";
import { decryptGitHubToken } from "@/lib/github/token";
import { changedRepositoryMetadataFields } from "@/lib/github/metadata";
import { shouldRefreshSourceDerivedHomepage } from "@/lib/github/project-updates";
import { refreshSkillSuggestions } from "@/lib/skills/suggestions";

type Snapshot = {
  githubRepositoryId: string;
  nodeId: string | null;
  githubOwnerId: string;
  ownerLogin: string;
  ownerType: "USER" | "ORGANIZATION";
  ownerAvatarUrl: string | null;
  name: string;
  fullName: string;
  description: string | null;
  githubUrl: string;
  homepageUrl: string | null;
  primaryLanguage: string | null;
  topics: string[];
  languageStatistics: Record<string, number>;
  starCount: number;
  forkCount: number;
  visibility: string;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  defaultBranch: string | null;
  latestCommit: {
    sha: string;
    url: string;
    message: string;
    authorName: string | null;
    authorLogin: string | null;
    authoredAt: string | null;
  } | null;
  githubCreatedAt: string | null;
  githubUpdatedAt: string | null;
  githubPushedAt: string | null;
};

function snapshotFromRepository(repository: {
  id: number;
  node_id?: string | null;
  owner: {
    id: number;
    login: string;
    type: "User" | "Organization";
    avatar_url?: string | null;
  };
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage?: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  visibility: string;
  archived: boolean;
  fork: boolean;
  is_template: boolean;
  default_branch?: string | null;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
}): Snapshot {
  return {
    githubRepositoryId: String(repository.id),
    nodeId: repository.node_id ?? null,
    githubOwnerId: String(repository.owner.id),
    ownerLogin: repository.owner.login,
    ownerType:
      repository.owner.type === "Organization" ? "ORGANIZATION" : "USER",
    ownerAvatarUrl: repository.owner.avatar_url ?? null,
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description,
    githubUrl: repository.html_url,
    homepageUrl: repository.homepage?.trim() || null,
    primaryLanguage: repository.language,
    topics: [...repository.topics].sort(),
    languageStatistics: {},
    starCount: repository.stargazers_count,
    forkCount: repository.forks_count,
    visibility: repository.visibility,
    isArchived: repository.archived,
    isFork: repository.fork,
    isTemplate: repository.is_template,
    defaultBranch: repository.default_branch ?? null,
    latestCommit: null,
    githubCreatedAt: repository.created_at,
    githubUpdatedAt: repository.updated_at,
    githubPushedAt: repository.pushed_at,
  };
}

function previousSnapshot(repository: GitHubRepository) {
  const value = repository.sourceSnapshot;
  return typeof value === "object" && value && !Array.isArray(value)
    ? (value as Snapshot)
    : null;
}

export type RepositoryExclusionReason =
  | "PRIVATE"
  | "FORK"
  | "ARCHIVED"
  | "TEMPLATE"
  | "OWNER_DISABLED"
  | "OWNER_INACCESSIBLE"
  | "INVALID_OWNER_TYPE"
  | "ALREADY_REVIEWED"
  | "DUPLICATE_GITHUB_ID";

export function repositoryExclusionReasons(
  snapshot: Snapshot,
  filters: {
    includeForks: boolean;
    includeArchived: boolean;
    includeTemplates: boolean;
  },
  context?: {
    ownerEnabled?: boolean;
    ownerAccessible?: boolean;
    alreadyReviewed?: boolean;
    duplicateGithubId?: boolean;
  },
): RepositoryExclusionReason[] {
  const reasons: RepositoryExclusionReason[] = [];
  if (snapshot.visibility !== "public") reasons.push("PRIVATE");
  if (snapshot.isFork && !filters.includeForks) reasons.push("FORK");
  if (snapshot.isArchived && !filters.includeArchived) reasons.push("ARCHIVED");
  if (snapshot.isTemplate && !filters.includeTemplates)
    reasons.push("TEMPLATE");
  if (context?.ownerEnabled === false) reasons.push("OWNER_DISABLED");
  if (context?.ownerAccessible === false) reasons.push("OWNER_INACCESSIBLE");
  if (!["USER", "ORGANIZATION"].includes(snapshot.ownerType)) {
    reasons.push("INVALID_OWNER_TYPE");
  }
  if (context?.alreadyReviewed) reasons.push("ALREADY_REVIEWED");
  if (context?.duplicateGithubId) reasons.push("DUPLICATE_GITHUB_ID");
  return reasons;
}

export function auditGitHubRepositorySource(
  repository: GitHubRepositorySource,
  filters: {
    includeForks: boolean;
    includeArchived: boolean;
    includeTemplates: boolean;
  },
) {
  const snapshot = snapshotFromRepository(repository);
  const exclusionReasons = repositoryExclusionReasons(snapshot, filters);
  return {
    githubRepositoryId: snapshot.githubRepositoryId,
    fullName: snapshot.fullName,
    githubUrl: snapshot.githubUrl,
    ownerLogin: snapshot.ownerLogin,
    ownerType: snapshot.ownerType,
    exclusionReasons,
    eligible: exclusionReasons.length === 0,
  };
}

function exclusionReason(
  snapshot: Snapshot,
  filters: {
    includeForks: boolean;
    includeArchived: boolean;
    includeTemplates: boolean;
  },
) {
  return repositoryExclusionReasons(snapshot, filters)[0] ?? null;
}

function ownerFilterAudit(
  repositories: GitHubRepositorySource[],
  filters: {
    includeForks: boolean;
    includeArchived: boolean;
    includeTemplates: boolean;
  },
  existingByExternalId: Map<string, GitHubRepository>,
) {
  const snapshots = repositories.map(snapshotFromRepository);
  const publicRepositories = snapshots.filter(
    (repository) => repository.visibility === "public",
  );
  const afterForkFilter = publicRepositories.filter(
    (repository) => filters.includeForks || !repository.isFork,
  );
  const afterArchivedFilter = afterForkFilter.filter(
    (repository) => filters.includeArchived || !repository.isArchived,
  );
  const afterTemplateFilter = afterArchivedFilter.filter(
    (repository) => filters.includeTemplates || !repository.isTemplate,
  );

  return {
    counts: {
      raw: snapshots.length,
      afterPublicFilter: publicRepositories.length,
      afterForkFilter: afterForkFilter.length,
      afterArchivedFilter: afterArchivedFilter.length,
      afterTemplateFilter: afterTemplateFilter.length,
      eligible: afterTemplateFilter.length,
    },
    ...(process.env.NODE_ENV === "development"
      ? {
          repositories: snapshots.map((repository) => ({
            githubRepositoryId: repository.githubRepositoryId,
            fullName: repository.fullName,
            exclusionReasons: repositoryExclusionReasons(repository, filters),
            reviewReason: existingByExternalId.has(
              repository.githubRepositoryId,
            )
              ? "ALREADY_REVIEWED"
              : null,
          })),
        }
      : {}),
  };
}

function date(value: string | null) {
  return value ? new Date(value) : null;
}

function includesScope(scopes: string[], scope: string) {
  return scopes.some((value) => value.toLowerCase() === scope.toLowerCase());
}

function organizationAccessError(
  error: unknown,
  hasReadOrg: boolean,
): {
  status:
    | "REAUTHORIZATION_REQUIRED"
    | "APPROVAL_REQUIRED"
    | "RESTRICTED"
    | "PARTIAL"
    | "UNAVAILABLE";
  message: string;
} {
  if (!hasReadOrg) {
    return {
      status: "REAUTHORIZATION_REQUIRED",
      message:
        "Reconnect GitHub to grant read:org before organization membership can be inspected reliably.",
    };
  }

  if (error instanceof GitHubApiError) {
    const message = error.message.toLowerCase();
    if (
      error.ssoHeader ||
      message.includes("saml") ||
      message.includes("oauth app access") ||
      message.includes("approval")
    ) {
      return {
        status: "APPROVAL_REQUIRED",
        message: error.message,
      };
    }
    if (error.status === 403 && error.rateLimitRemaining === 0) {
      return { status: "PARTIAL", message: error.message };
    }
    if (error.status === 403) {
      return { status: "RESTRICTED", message: error.message };
    }
    return { status: "UNAVAILABLE", message: error.message };
  }

  return {
    status: "UNAVAILABLE",
    message:
      error instanceof Error
        ? error.message
        : "The organization could not be inspected.",
  };
}

export type GitHubSyncSummary = {
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
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
};

export async function synchronizeGitHubRepositories(
  userId: string,
): Promise<GitHubSyncSummary> {
  const connection = await db.gitHubConnection.findFirst({
    where: { userId, isActive: true },
  });

  if (!connection) {
    throw new Error("Connect the approved GitHub account before syncing.");
  }

  const syncRun = await db.gitHubSyncRun.create({
    data: {
      userId,
      connectionId: connection.id,
    },
  });

  try {
    const token = decryptGitHubToken(connection.encryptedAccessToken);
    const client = createGitHubClient(token);
    const hasReadOrg = includesScope(connection.scopes, "read:org");
    const [
      authenticatedUser,
      accessibleRepositoryResult,
      existingRepositories,
      existingOwners,
    ] = await Promise.all([
      client.getAuthenticatedUser(),
      client.listAccessiblePublicRepositoriesWithDiagnostics(),
      db.gitHubRepository.findMany({
        where: { connectionId: connection.id },
        include: {
          project: {
            select: { id: true, liveUrl: true },
          },
        },
      }),
      db.gitHubOwner.findMany({
        where: { connectionId: connection.id },
      }),
    ]);
    const accessibleRepositories = accessibleRepositoryResult.items;
    const warnings: string[] = [];
    let partialFailures = 0;
    let organizationSources: Array<{
      id: number;
      login: string;
      avatar_url?: string | null;
    }> = [];
    let organizationDiscoveryDiagnostics: GitHubListDiagnostics | null = null;

    try {
      const organizationResult =
        await client.listOrganizationsWithDiagnostics();
      organizationSources = organizationResult.items;
      organizationDiscoveryDiagnostics = organizationResult.diagnostics;
    } catch (error) {
      partialFailures += 1;
      const access = organizationAccessError(error, hasReadOrg);
      warnings.push(`Organization discovery: ${access.message}`);
    }

    const existingOwnerByGithubId = new Map(
      existingOwners.map((owner) => [owner.githubOwnerId, owner]),
    );
    const organizationCandidates = discoverOrganizationCandidates({
      organizations: organizationSources,
      repositories: accessibleRepositories,
      existingOrganizations: existingOwners
        .filter((owner) => owner.type === "ORGANIZATION")
        .map((owner) => ({
          githubOwnerId: owner.githubOwnerId,
          login: owner.login,
          avatarUrl: owner.avatarUrl,
          preference: owner.preference,
        })),
    });

    const successfullyInspectedOwners = new Set<string>([
      connection.githubLogin.toLowerCase(),
    ]);
    const personalRepositories = accessibleRepositories.filter(
      (repository) =>
        repository.owner.type === "User" &&
        repository.owner.login.toLowerCase() ===
          connection.githubLogin.toLowerCase(),
    );
    const sourceRepositoryGroups: GitHubRepositorySource[][] = [
      personalRepositories,
    ];

    type OwnerState = {
      githubOwnerId: string;
      login: string;
      type: "USER" | "ORGANIZATION";
      avatarUrl: string | null;
      preference: GitHubOwnerPreference;
      syncEnabled: boolean;
      accessStatus:
        | "ACCESSIBLE"
        | "REAUTHORIZATION_REQUIRED"
        | "APPROVAL_REQUIRED"
        | "RESTRICTED"
        | "PARTIAL"
        | "UNAVAILABLE";
      accessMessage: string | null;
      inspectionSucceeded: boolean;
      lastApiStatus: number | null;
      rawRepositoryCount: number;
      diagnosticData: Prisma.InputJsonValue;
    };

    const ownerStates: OwnerState[] = [
      {
        githubOwnerId: String(authenticatedUser.id),
        login: authenticatedUser.login,
        type: "USER",
        avatarUrl: authenticatedUser.avatar_url ?? null,
        preference: "ENABLED",
        syncEnabled: true,
        accessStatus: "ACCESSIBLE",
        accessMessage: null,
        inspectionSucceeded: true,
        lastApiStatus: accessibleRepositoryResult.diagnostics.status,
        rawRepositoryCount: personalRepositories.length,
        diagnosticData: {
          requestedScopes: ["read:user", "user:email", "read:org"],
          grantedScopes: accessibleRepositoryResult.diagnostics.grantedScopes,
          repositoryListing: accessibleRepositoryResult.diagnostics,
          ...(process.env.NODE_ENV === "development"
            ? {
                fullNames: personalRepositories.map(
                  (repository) => repository.full_name,
                ),
              }
            : {}),
        },
      },
    ];
    let organizationsSynchronized = 0;
    let organizationsSkipped = 0;
    let organizationsRequiringApproval = 0;

    for (const candidate of organizationCandidates) {
      const syncEnabled = candidate.preference === "ENABLED";
      if (!syncEnabled) {
        organizationsSkipped += 1;
        const repositoriesFromAuthenticatedListing =
          accessibleRepositories.filter(
            (repository) =>
              repository.owner.type === "Organization" &&
              String(repository.owner.id) === candidate.githubOwnerId,
          );
        ownerStates.push({
          ...candidate,
          syncEnabled,
          type: "ORGANIZATION",
          accessStatus: hasReadOrg ? "ACCESSIBLE" : "REAUTHORIZATION_REQUIRED",
          accessMessage: hasReadOrg
            ? candidate.preference === "PENDING"
              ? "Review this newly discovered organization before enabling repository synchronization."
              : "Organization synchronization is ignored. Existing repositories and projects are preserved."
            : "Reconnect GitHub to grant read:org.",
          inspectionSucceeded: false,
          lastApiStatus:
            repositoriesFromAuthenticatedListing.length > 0
              ? accessibleRepositoryResult.diagnostics.status
              : (organizationDiscoveryDiagnostics?.status ?? null),
          rawRepositoryCount: repositoriesFromAuthenticatedListing.length,
          diagnosticData: {
            organizationDiscovery: organizationDiscoveryDiagnostics,
            authenticatedUserRepositoryListing:
              accessibleRepositoryResult.diagnostics,
            preference: candidate.preference,
            exclusionReason:
              candidate.preference === "IGNORED"
                ? "OWNER_IGNORED"
                : "OWNER_PENDING",
          },
        });
        continue;
      }

      const repositoriesFromAuthenticatedListing =
        accessibleRepositories.filter(
          (repository) =>
            repository.owner.type === "Organization" &&
            String(repository.owner.id) === candidate.githubOwnerId,
        );
      sourceRepositoryGroups.push(repositoriesFromAuthenticatedListing);

      try {
        const organizationResult =
          await client.listOrganizationRepositoriesWithDiagnostics(
            candidate.login,
          );
        const organizationRepositories = organizationResult.items;
        let organizationApprovalState = "APPROVED_OR_NOT_RESTRICTED";
        let membershipWarning: string | null = null;
        try {
          await client.getOrganizationMembershipWithDiagnostics(
            candidate.login,
          );
        } catch (error) {
          if (
            error instanceof GitHubApiError &&
            error.status === 403 &&
            error.message.toLowerCase().includes("oauth app access")
          ) {
            organizationApprovalState = "OAUTH_APP_ACCESS_RESTRICTED";
            membershipWarning =
              "GitHub reports that this organization restricts OAuth app access. Public repositories remain syncable, but an organization owner must approve this OAuth app for membership data.";
            organizationsRequiringApproval += 1;
            warnings.push(`${candidate.login}: ${membershipWarning}`);
          } else {
            organizationApprovalState = "MEMBERSHIP_UNAVAILABLE";
            membershipWarning =
              "Organization membership could not be inspected, but the public repository endpoint succeeded.";
            warnings.push(`${candidate.login}: ${membershipWarning}`);
          }
        }
        sourceRepositoryGroups.push(organizationRepositories);
        successfullyInspectedOwners.add(candidate.login.toLowerCase());
        organizationsSynchronized += 1;

        ownerStates.push({
          ...candidate,
          syncEnabled,
          type: "ORGANIZATION",
          accessStatus: !hasReadOrg ? "REAUTHORIZATION_REQUIRED" : "ACCESSIBLE",
          accessMessage: !hasReadOrg
            ? "Reconnect GitHub to grant read:org for reliable organization membership discovery."
            : (membershipWarning ??
              (repositoriesFromAuthenticatedListing.length === 0
                ? "Public repositories are accessible through the organization endpoint, but GitHub omitted this organization from the authenticated-user listings."
                : null)),
          inspectionSucceeded: true,
          lastApiStatus: organizationResult.diagnostics.status,
          rawRepositoryCount: organizationRepositories.length,
          diagnosticData: {
            requestedScopes: ["read:user", "user:email", "read:org"],
            grantedScopes: organizationResult.diagnostics.grantedScopes,
            organizationDiscovery: organizationDiscoveryDiagnostics,
            authenticatedUserRepositoryListing:
              accessibleRepositoryResult.diagnostics,
            organizationRepositoryListing: organizationResult.diagnostics,
            organizationApprovalState,
            membershipWarning,
            ...(process.env.NODE_ENV === "development"
              ? {
                  fullNames: organizationRepositories.map(
                    (repository) => repository.full_name,
                  ),
                }
              : {}),
          },
        });
      } catch (error) {
        partialFailures += 1;
        organizationsSkipped += 1;
        const access = organizationAccessError(error, hasReadOrg);
        if (access.status === "APPROVAL_REQUIRED") {
          organizationsRequiringApproval += 1;
        }
        warnings.push(`${candidate.login}: ${access.message}`);
        ownerStates.push({
          ...candidate,
          syncEnabled,
          type: "ORGANIZATION",
          accessStatus: access.status,
          accessMessage: access.message,
          inspectionSucceeded: false,
          lastApiStatus: error instanceof GitHubApiError ? error.status : null,
          rawRepositoryCount: 0,
          diagnosticData: {
            organizationDiscovery: organizationDiscoveryDiagnostics,
            error: access.message,
          },
        });
      }
    }

    if (!hasReadOrg) {
      warnings.unshift(
        "Reconnect GitHub to grant read:org. Organization discovery is incomplete until reauthorization succeeds.",
      );
    }

    const mergedRepositories = mergeRepositoriesByGithubId(
      sourceRepositoryGroups,
    );
    const sourceRepositories = mergedRepositories.repositories;
    const existingByExternalId = new Map(
      existingRepositories.map((repository) => [
        repository.githubRepositoryId,
        repository,
      ]),
    );
    const seenExternalIds = new Set<string>();
    const prepared: Array<{
      existing:
        | (GitHubRepository & {
            project: { id: string; liveUrl: string | null } | null;
          })
        | null;
      snapshot: Snapshot;
      fieldsChanged: string[];
      unavailableReason: string | null;
      readmePreview: string | null;
      readmeMarkdown: string | null;
      readmeImages: Prisma.InputJsonValue | null;
      sourceFilesSnapshot: Prisma.InputJsonValue | null;
      enrichmentSnapshot: Prisma.InputJsonValue | null;
      enrichmentFingerprint: string | null;
      enrichmentVersion: number;
      enrichmentError: string | null;
      detectedTechnologies: string[];
      suggestedTitle: string | null;
      suggestedShortDescription: string | null;
      suggestedLongDescription: string | null;
      suggestedCoverImageUrl: string | null;
      enrichedAt: Date | null;
      refreshLinkedProjectHomepage: boolean;
    }> = [];

    for (const source of sourceRepositories) {
      const snapshot = snapshotFromRepository(source);
      const ownerState = ownerStates.find(
        (owner) =>
          owner.login.toLowerCase() === snapshot.ownerLogin.toLowerCase(),
      );
      if (
        snapshot.ownerType === "ORGANIZATION" &&
        (!ownerState || !ownerState.syncEnabled)
      ) {
        continue;
      }
      seenExternalIds.add(snapshot.githubRepositoryId);
      const existing =
        existingByExternalId.get(snapshot.githubRepositoryId) ?? null;
      const unavailableReason = exclusionReason(snapshot, connection);

      if (!existing && unavailableReason) {
        continue;
      }

      let readmePreview = existing?.readmePreview ?? null;
      let readmeMarkdown = existing?.readmeMarkdown ?? null;
      let readmeChanged = false;
      let readmeImages =
        (existing?.readmeImages as Prisma.InputJsonValue | null | undefined) ??
        null;
      let sourceFilesSnapshot =
        (existing?.sourceFilesSnapshot as
          | Prisma.InputJsonValue
          | null
          | undefined) ?? null;
      let enrichmentSnapshot =
        (existing?.enrichmentSnapshot as
          | Prisma.InputJsonValue
          | null
          | undefined) ?? null;
      let enrichmentFingerprint = existing?.enrichmentFingerprint ?? null;
      let enrichmentVersion = existing?.enrichmentVersion ?? 0;
      let enrichmentError: string | null = existing?.enrichmentError ?? null;
      let detectedTechnologies = existing?.detectedTechnologies ?? [];
      let suggestedTitle = existing?.suggestedTitle ?? null;
      let suggestedShortDescription =
        existing?.suggestedShortDescription ?? null;
      let suggestedLongDescription = existing?.suggestedLongDescription ?? null;
      let suggestedCoverImageUrl = existing?.suggestedCoverImageUrl ?? null;
      let enrichedAt = existing?.enrichedAt ?? null;

      if (!unavailableReason) {
        const [languages, latestCommit, readme] = await Promise.all([
          client.getRepositoryLanguages(snapshot.ownerLogin, snapshot.name),
          client.getLatestCommit(
            snapshot.ownerLogin,
            snapshot.name,
            snapshot.defaultBranch,
          ),
          client.getReadmeMarkdown(snapshot.ownerLogin, snapshot.name),
        ]);
        snapshot.languageStatistics = languages.languages;
        snapshot.latestCommit = latestCommit.commit;
        if (languages.warning) warnings.push(languages.warning);
        if (latestCommit.warning) warnings.push(latestCommit.warning);
        if (readme.warning) {
          warnings.push(readme.warning);
        } else {
          readmeChanged = readmeMarkdown !== readme.markdown;
          readmeMarkdown = readme.markdown;
          readmePreview = readme.markdown?.slice(0, 5000) ?? null;
        }
      }

      const previous = existing ? previousSnapshot(existing) : null;
      const fieldsChanged: string[] = changedRepositoryMetadataFields(
        previous,
        snapshot,
      );
      if (existing && readmeChanged) fieldsChanged.push("readmeMarkdown");

      const shouldEnrich =
        !unavailableReason &&
        (!existing ||
          existing.enrichmentVersion < GITHUB_ENRICHMENT_VERSION ||
          !existing.enrichmentFingerprint ||
          readmeChanged ||
          fieldsChanged.some((field) =>
            [
              "name",
              "description",
              "primaryLanguage",
              "topics",
              "defaultBranch",
            ].includes(field),
          ) ||
          existing.githubPushedAt?.getTime() !==
            date(snapshot.githubPushedAt)?.getTime());

      if (shouldEnrich) {
        enrichmentError = null;
        try {
          const content = snapshot.defaultBranch
            ? await client.getRepositoryContentInputs(
                snapshot.ownerLogin,
                snapshot.name,
                snapshot.defaultBranch,
              )
            : {
                files: [],
                warnings: ["Repository has no default branch."],
                treeTruncated: false,
                treeEntries: 0,
              };
          warnings.push(
            ...content.warnings.map(
              (warning) => `${snapshot.fullName}: ${warning}`,
            ),
          );
          if (content.treeTruncated) {
            warnings.push(
              `${snapshot.fullName}: GitHub returned a truncated repository tree; enrichment used the available files.`,
            );
          }
          const enrichment = analyzeRepositoryContents({
            context: {
              owner: snapshot.ownerLogin,
              name: snapshot.name,
              defaultBranch: snapshot.defaultBranch ?? "main",
              description: snapshot.description,
              primaryLanguage: snapshot.primaryLanguage,
              topics: snapshot.topics,
            },
            files: content.files,
            readmeMarkdown,
          });
          const previousSuggestions = {
            suggestedTitle: existing?.suggestedTitle ?? null,
            suggestedShortDescription:
              existing?.suggestedShortDescription ?? null,
            suggestedLongDescription:
              existing?.suggestedLongDescription ?? null,
            detectedTechnologies: existing?.detectedTechnologies ?? [],
            suggestedCoverImageUrl: existing?.suggestedCoverImageUrl ?? null,
          };
          const nextSuggestions = {
            suggestedTitle: enrichment.suggestions.title,
            suggestedShortDescription: enrichment.suggestions.shortDescription,
            suggestedLongDescription: enrichment.suggestions.longDescription,
            detectedTechnologies: enrichment.detectedTechnologies,
            suggestedCoverImageUrl: enrichment.suggestions.coverImageUrl,
          };
          if (existing) {
            for (const field of Object.keys(nextSuggestions) as Array<
              keyof typeof nextSuggestions
            >) {
              if (
                JSON.stringify(previousSuggestions[field]) !==
                JSON.stringify(nextSuggestions[field])
              ) {
                fieldsChanged.push(field);
              }
            }
          }
          readmeImages =
            enrichment.readmeImages as unknown as Prisma.InputJsonValue;
          sourceFilesSnapshot = {
            files: enrichment.sourceFiles,
            treeEntries: content.treeEntries,
            treeTruncated: content.treeTruncated,
          };
          enrichmentSnapshot =
            enrichment.snapshot as unknown as Prisma.InputJsonValue;
          enrichmentFingerprint = enrichment.fingerprint;
          enrichmentVersion = enrichment.version;
          detectedTechnologies = enrichment.detectedTechnologies;
          suggestedTitle = enrichment.suggestions.title;
          suggestedShortDescription = enrichment.suggestions.shortDescription;
          suggestedLongDescription = enrichment.suggestions.longDescription;
          suggestedCoverImageUrl = enrichment.suggestions.coverImageUrl;
          enrichedAt = new Date();
        } catch (error) {
          enrichmentError =
            error instanceof Error
              ? error.message
              : "Repository content enrichment failed.";
          warnings.push(`${snapshot.fullName}: ${enrichmentError}`);
        }
      }

      prepared.push({
        existing,
        snapshot,
        fieldsChanged,
        unavailableReason,
        readmePreview,
        readmeMarkdown,
        readmeImages,
        sourceFilesSnapshot,
        enrichmentSnapshot,
        enrichmentFingerprint,
        enrichmentVersion,
        enrichmentError,
        detectedTechnologies,
        suggestedTitle,
        suggestedShortDescription,
        suggestedLongDescription,
        suggestedCoverImageUrl,
        enrichedAt,
        refreshLinkedProjectHomepage: Boolean(
          existing?.project &&
            shouldRefreshSourceDerivedHomepage({
              projectLiveUrl: existing.project.liveUrl,
              previousHomepageUrl: previous?.homepageUrl,
              incomingHomepageUrl: snapshot.homepageUrl,
            }),
        ),
      });
    }

    const missing = existingRepositories.filter(
      (repository) =>
        !seenExternalIds.has(repository.githubRepositoryId) &&
        !repository.unavailableAt &&
        successfullyInspectedOwners.has(repository.ownerLogin.toLowerCase()),
    );
    const now = new Date();

    const summary = await db.$transaction(async (transaction) => {
      let discovered = 0;
      let changed = 0;
      let unchanged = 0;
      let unavailable = 0;
      const ownerRecordIds = new Map<string, string>();

      for (const owner of ownerStates) {
        const ownerRepositories = sourceRepositories.filter(
          (repository) =>
            repository.owner.login.toLowerCase() === owner.login.toLowerCase(),
        );
        const filterAudit = ownerFilterAudit(
          ownerRepositories,
          connection,
          existingByExternalId,
        );
        const eligibleRepositoryCount = filterAudit.counts.eligible;
        const diagnosticData = {
          ...(owner.diagnosticData as Prisma.InputJsonObject),
          filters: filterAudit,
        };
        const existing = existingOwnerByGithubId.get(owner.githubOwnerId);
        const ownerRecord = await transaction.gitHubOwner.upsert({
          where: existing
            ? { id: existing.id }
            : {
                connectionId_githubOwnerId: {
                  connectionId: connection.id,
                  githubOwnerId: owner.githubOwnerId,
                },
              },
          update: {
            githubOwnerId: owner.githubOwnerId,
            login: owner.login,
            type: owner.type,
            avatarUrl: owner.avatarUrl,
            preference: owner.preference,
            syncEnabled: owner.syncEnabled,
            accessStatus: owner.accessStatus,
            accessMessage: owner.accessMessage,
            lastApiStatus: owner.lastApiStatus,
            rawRepositoryCount: owner.rawRepositoryCount,
            eligibleRepositoryCount,
            diagnosticData,
            lastDiscoveredAt: now,
            lastSuccessfulSyncAt: owner.inspectionSucceeded ? now : undefined,
          },
          create: {
            connectionId: connection.id,
            githubOwnerId: owner.githubOwnerId,
            login: owner.login,
            type: owner.type,
            avatarUrl: owner.avatarUrl,
            preference: owner.preference,
            syncEnabled: owner.syncEnabled,
            accessStatus: owner.accessStatus,
            accessMessage: owner.accessMessage,
            lastApiStatus: owner.lastApiStatus,
            rawRepositoryCount: owner.rawRepositoryCount,
            eligibleRepositoryCount,
            diagnosticData,
            lastDiscoveredAt: now,
            lastSuccessfulSyncAt: owner.inspectionSucceeded ? now : null,
          },
        });
        ownerRecordIds.set(owner.githubOwnerId, ownerRecord.id);
      }

      for (const item of prepared) {
        const becameUnavailable =
          Boolean(item.unavailableReason) && !item.existing?.unavailableAt;
        const becameAvailable =
          !item.unavailableReason && Boolean(item.existing?.unavailableAt);
        const changeType = !item.existing
          ? "NEW"
          : becameUnavailable
            ? "UNAVAILABLE"
            : item.fieldsChanged.length || becameAvailable
              ? "UPDATED"
              : "UNCHANGED";

        if (changeType === "NEW") discovered += 1;
        else if (changeType === "UPDATED") changed += 1;
        else if (changeType === "UNAVAILABLE") unavailable += 1;
        else unchanged += 1;

        const snapshot = item.snapshot;
        const repository = await transaction.gitHubRepository.upsert({
          where: {
            connectionId_githubRepositoryId: {
              connectionId: connection.id,
              githubRepositoryId: snapshot.githubRepositoryId,
            },
          },
          update: {
            ownerRecordId: ownerRecordIds.get(snapshot.githubOwnerId) ?? null,
            nodeId: snapshot.nodeId,
            ownerLogin: snapshot.ownerLogin,
            ownerType: snapshot.ownerType,
            ownerAvatarUrl: snapshot.ownerAvatarUrl,
            name: snapshot.name,
            fullName: snapshot.fullName,
            description: snapshot.description,
            githubUrl: snapshot.githubUrl,
            homepageUrl: snapshot.homepageUrl,
            primaryLanguage: snapshot.primaryLanguage,
            topics: snapshot.topics,
            starCount: snapshot.starCount,
            forkCount: snapshot.forkCount,
            visibility: snapshot.visibility,
            isArchived: snapshot.isArchived,
            isFork: snapshot.isFork,
            isTemplate: snapshot.isTemplate,
            defaultBranch: snapshot.defaultBranch,
            readmePreview: item.readmePreview,
            readmeMarkdown: item.readmeMarkdown,
            readmeImages: item.readmeImages ?? Prisma.JsonNull,
            sourceFilesSnapshot: item.sourceFilesSnapshot ?? Prisma.JsonNull,
            enrichmentSnapshot: item.enrichmentSnapshot ?? Prisma.JsonNull,
            enrichmentFingerprint: item.enrichmentFingerprint,
            enrichmentVersion: item.enrichmentVersion,
            enrichmentError: item.enrichmentError,
            detectedTechnologies: item.detectedTechnologies,
            suggestedTitle: item.suggestedTitle,
            suggestedShortDescription: item.suggestedShortDescription,
            suggestedLongDescription: item.suggestedLongDescription,
            suggestedCoverImageUrl: item.suggestedCoverImageUrl,
            enrichedAt: item.enrichedAt,
            githubCreatedAt: date(snapshot.githubCreatedAt),
            githubUpdatedAt: date(snapshot.githubUpdatedAt),
            githubPushedAt: date(snapshot.githubPushedAt),
            lastSeenAt: now,
            lastSuccessfulSyncAt: now,
            unavailableAt: item.unavailableReason ? now : null,
            unavailableReason: item.unavailableReason,
            sourceSnapshot: snapshot,
          },
          create: {
            connectionId: connection.id,
            ownerRecordId: ownerRecordIds.get(snapshot.githubOwnerId) ?? null,
            githubRepositoryId: snapshot.githubRepositoryId,
            nodeId: snapshot.nodeId,
            ownerLogin: snapshot.ownerLogin,
            ownerType: snapshot.ownerType,
            ownerAvatarUrl: snapshot.ownerAvatarUrl,
            name: snapshot.name,
            fullName: snapshot.fullName,
            description: snapshot.description,
            githubUrl: snapshot.githubUrl,
            homepageUrl: snapshot.homepageUrl,
            primaryLanguage: snapshot.primaryLanguage,
            topics: snapshot.topics,
            starCount: snapshot.starCount,
            forkCount: snapshot.forkCount,
            visibility: snapshot.visibility,
            isArchived: snapshot.isArchived,
            isFork: snapshot.isFork,
            isTemplate: snapshot.isTemplate,
            defaultBranch: snapshot.defaultBranch,
            readmePreview: item.readmePreview,
            readmeMarkdown: item.readmeMarkdown,
            readmeImages: item.readmeImages ?? Prisma.JsonNull,
            sourceFilesSnapshot: item.sourceFilesSnapshot ?? Prisma.JsonNull,
            enrichmentSnapshot: item.enrichmentSnapshot ?? Prisma.JsonNull,
            enrichmentFingerprint: item.enrichmentFingerprint,
            enrichmentVersion: item.enrichmentVersion,
            enrichmentError: item.enrichmentError,
            detectedTechnologies: item.detectedTechnologies,
            suggestedTitle: item.suggestedTitle,
            suggestedShortDescription: item.suggestedShortDescription,
            suggestedLongDescription: item.suggestedLongDescription,
            suggestedCoverImageUrl: item.suggestedCoverImageUrl,
            enrichedAt: item.enrichedAt,
            githubCreatedAt: date(snapshot.githubCreatedAt),
            githubUpdatedAt: date(snapshot.githubUpdatedAt),
            githubPushedAt: date(snapshot.githubPushedAt),
            lastSeenAt: now,
            lastSuccessfulSyncAt: now,
            unavailableAt: item.unavailableReason ? now : null,
            unavailableReason: item.unavailableReason,
            sourceSnapshot: snapshot,
          },
        });

        if (item.refreshLinkedProjectHomepage && item.existing?.project) {
          await transaction.portfolioProject.update({
            where: { id: item.existing.project.id },
            data: { liveUrl: snapshot.homepageUrl },
          });
        }

        await transaction.gitHubSyncItem.create({
          data: {
            syncRunId: syncRun.id,
            repositoryId: repository.id,
            changeType,
            previousData: item.existing?.sourceSnapshot ?? undefined,
            incomingData: snapshot,
            fieldsChanged: [
              ...item.fieldsChanged,
              ...(becameAvailable ? ["availability"] : []),
            ],
          },
        });
      }

      for (const repository of missing) {
        unavailable += 1;
        await transaction.gitHubRepository.update({
          where: { id: repository.id },
          data: {
            unavailableAt: now,
            unavailableReason: "NOT_RETURNED_BY_GITHUB",
          },
        });
        await transaction.gitHubSyncItem.create({
          data: {
            syncRunId: syncRun.id,
            repositoryId: repository.id,
            changeType: "UNAVAILABLE",
            previousData:
              repository.sourceSnapshot === null
                ? undefined
                : (repository.sourceSnapshot as Prisma.InputJsonValue),
            incomingData:
              repository.sourceSnapshot === null
                ? {}
                : (repository.sourceSnapshot as Prisma.InputJsonValue),
            fieldsChanged: ["availability"],
          },
        });
      }

      await transaction.gitHubConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncedAt: now,
        },
      });

      await transaction.gitHubSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "COMPLETED",
          repositoriesSeen: sourceRepositories.length,
          personalRepositoriesFound: personalRepositories.length,
          organizationsDiscovered: organizationCandidates.filter(
            (owner) =>
              owner.discoveredFromOrganizations ||
              owner.inferredFromRepositories,
          ).length,
          organizationRepositoriesFound: sourceRepositories.filter(
            (repository) => repository.owner.type === "Organization",
          ).length,
          organizationsSynchronized,
          organizationsSkipped,
          organizationsRequiringApproval,
          partialFailureCount: partialFailures,
          newCount: discovered,
          changedCount: changed,
          unchangedCount: unchanged,
          unavailableCount: unavailable,
          warningCount: warnings.length,
          rateLimitRemaining: client.rateLimit.remaining,
          rateLimitResetAt: client.rateLimit.resetAt,
          errorMessage: warnings.length
            ? warnings.slice(0, 10).join("\n")
            : null,
          completedAt: now,
        },
      });

      return {
        seen: sourceRepositories.length,
        personalRepositoriesFound: personalRepositories.length,
        organizationsDiscovered: organizationCandidates.filter(
          (owner) =>
            owner.discoveredFromOrganizations || owner.inferredFromRepositories,
        ).length,
        organizationRepositoriesFound: sourceRepositories.filter(
          (repository) => repository.owner.type === "Organization",
        ).length,
        organizationsSynchronized,
        organizationsSkipped,
        organizationsRequiringApproval,
        partialFailures,
        discovered,
        changed,
        unchanged,
        unavailable,
        warnings: warnings.length,
        rateLimitRemaining: client.rateLimit.remaining,
        rateLimitResetAt: client.rateLimit.resetAt?.toISOString() ?? null,
      };
    });

    await refreshSkillSuggestions(userId);
    return summary;
  } catch (error) {
    const githubError = error instanceof GitHubApiError ? error : null;
    await db.gitHubSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error
            ? error.message
            : "GitHub synchronization failed.",
        rateLimitRemaining: githubError?.rateLimitRemaining ?? null,
        rateLimitResetAt: githubError?.rateLimitResetAt ?? null,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

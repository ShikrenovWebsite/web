export const repositoryMetadataFields = [
  "githubRepositoryId",
  "nodeId",
  "githubOwnerId",
  "ownerLogin",
  "ownerType",
  "ownerAvatarUrl",
  "name",
  "fullName",
  "description",
  "githubUrl",
  "homepageUrl",
  "primaryLanguage",
  "topics",
  "languageStatistics",
  "starCount",
  "forkCount",
  "visibility",
  "isArchived",
  "isFork",
  "isTemplate",
  "defaultBranch",
  "latestCommit",
  "githubCreatedAt",
  "githubUpdatedAt",
  "githubPushedAt",
] as const;

type RepositoryMetadata = Record<
  (typeof repositoryMetadataFields)[number],
  unknown
>;

export function changedRepositoryMetadataFields(
  previous: Partial<RepositoryMetadata> | null,
  incoming: RepositoryMetadata,
) {
  if (!previous) return [...repositoryMetadataFields];
  return repositoryMetadataFields.filter(
    (field) =>
      JSON.stringify(previous[field]) !== JSON.stringify(incoming[field]),
  );
}

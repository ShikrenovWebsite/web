export type GitHubOwnerPreference = "PENDING" | "ENABLED" | "IGNORED";

type OrganizationSource = {
  id: number;
  login: string;
  avatar_url?: string | null;
};

type RepositoryOwnerSource = {
  owner: {
    id: number;
    login: string;
    type: "User" | "Organization";
    avatar_url?: string | null;
  };
};

type ExistingOrganization = {
  githubOwnerId: string;
  login: string;
  avatarUrl: string | null;
  preference: GitHubOwnerPreference;
};

export type OrganizationCandidate = {
  githubOwnerId: string;
  login: string;
  avatarUrl: string | null;
  preference: GitHubOwnerPreference;
  discoveredFromOrganizations: boolean;
  inferredFromRepositories: boolean;
  previouslyPersisted: boolean;
};

export function discoverOrganizationCandidates(input: {
  organizations: OrganizationSource[];
  repositories: RepositoryOwnerSource[];
  existingOrganizations: ExistingOrganization[];
}) {
  const existingByGithubId = new Map(
    input.existingOrganizations.map((owner) => [
      owner.githubOwnerId,
      owner,
    ]),
  );
  const candidates = new Map<string, OrganizationCandidate>();

  function merge(
    source: {
      githubOwnerId: string;
      login: string;
      avatarUrl: string | null;
    },
    discovery: {
      discoveredFromOrganizations?: boolean;
      inferredFromRepositories?: boolean;
      previouslyPersisted?: boolean;
    },
  ) {
    const existing = existingByGithubId.get(source.githubOwnerId);
    const current = candidates.get(source.githubOwnerId);
    candidates.set(source.githubOwnerId, {
      githubOwnerId: source.githubOwnerId,
      login: source.login || current?.login || existing?.login || "",
      avatarUrl:
        source.avatarUrl ?? current?.avatarUrl ?? existing?.avatarUrl ?? null,
      preference: existing?.preference ?? current?.preference ?? "PENDING",
      discoveredFromOrganizations:
        Boolean(current?.discoveredFromOrganizations) ||
        Boolean(discovery.discoveredFromOrganizations),
      inferredFromRepositories:
        Boolean(current?.inferredFromRepositories) ||
        Boolean(discovery.inferredFromRepositories),
      previouslyPersisted:
        Boolean(current?.previouslyPersisted) ||
        Boolean(discovery.previouslyPersisted) ||
        Boolean(existing),
    });
  }

  for (const organization of input.organizations) {
    merge(
      {
        githubOwnerId: String(organization.id),
        login: organization.login,
        avatarUrl: organization.avatar_url ?? null,
      },
      { discoveredFromOrganizations: true },
    );
  }

  for (const repository of input.repositories) {
    if (repository.owner.type !== "Organization") continue;
    merge(
      {
        githubOwnerId: String(repository.owner.id),
        login: repository.owner.login,
        avatarUrl: repository.owner.avatar_url ?? null,
      },
      { inferredFromRepositories: true },
    );
  }

  for (const owner of input.existingOrganizations) {
    merge(owner, { previouslyPersisted: true });
  }

  return [...candidates.values()].sort((left, right) =>
    left.login.localeCompare(right.login, "en", { sensitivity: "base" }),
  );
}

export function mergeRepositoriesByGithubId<
  T extends { id: number },
>(repositoryGroups: T[][]) {
  const repositories = new Map<string, T>();
  const duplicateGithubIds = new Set<string>();

  for (const group of repositoryGroups) {
    for (const repository of group) {
      const githubId = String(repository.id);
      if (repositories.has(githubId)) duplicateGithubIds.add(githubId);
      repositories.set(githubId, repository);
    }
  }

  return {
    repositories: [...repositories.values()],
    duplicateGithubIds: [...duplicateGithubIds],
  };
}

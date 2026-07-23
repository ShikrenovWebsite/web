import assert from "node:assert/strict";
import test from "node:test";
import {
  discoverOrganizationCandidates,
  mergeRepositoriesByGithubId,
} from "./owners";

const organizationRepository = (
  id: number,
  ownerId: number,
  ownerLogin: string,
  name = "web",
) => ({
  id,
  name,
  owner: {
    id: ownerId,
    login: ownerLogin,
    type: "Organization" as const,
    avatar_url: `https://avatars.example/${ownerId}`,
  },
});

test("discovers several organizations beneath one connection record", () => {
  const organizations = discoverOrganizationCandidates({
    organizations: [
      { id: 11, login: "Alpha" },
      { id: 12, login: "Beta" },
    ],
    repositories: [],
    existingOrganizations: [],
  });
  const connectionId = "one-github-connection";
  const persistenceRows = organizations.map((organization) => ({
    connectionId,
    ...organization,
  }));

  assert.equal(persistenceRows.length, 2);
  assert.ok(persistenceRows.every((owner) => owner.connectionId === connectionId));
  assert.ok(
    persistenceRows.every(
      (owner) =>
        !Object.hasOwn(owner, "userId") &&
        !Object.hasOwn(owner, "portfolioId") &&
        !Object.hasOwn(owner, "githubConnection"),
    ),
  );
});

test("discovers organizations returned by /user/orgs as pending", () => {
  const [organization] = discoverOrganizationCandidates({
    organizations: [{ id: 21, login: "FromMembership" }],
    repositories: [],
    existingOrganizations: [],
  });

  assert.equal(organization.githubOwnerId, "21");
  assert.equal(organization.preference, "PENDING");
  assert.equal(organization.discoveredFromOrganizations, true);
});

test("infers organizations found only in authenticated repository owners", () => {
  const [organization] = discoverOrganizationCandidates({
    organizations: [],
    repositories: [organizationRepository(100, 31, "InferredOnly")],
    existingOrganizations: [],
  });

  assert.equal(organization.githubOwnerId, "31");
  assert.equal(organization.login, "InferredOnly");
  assert.equal(organization.inferredFromRepositories, true);
  assert.equal(organization.preference, "PENDING");
});

test("merges duplicate organization discoveries by stable GitHub owner ID", () => {
  const organizations = discoverOrganizationCandidates({
    organizations: [{ id: 41, login: "CanonicalCase" }],
    repositories: [
      organizationRepository(101, 41, "canonicalcase"),
      organizationRepository(102, 41, "CanonicalCase"),
    ],
    existingOrganizations: [],
  });

  assert.equal(organizations.length, 1);
  assert.equal(organizations[0].githubOwnerId, "41");
  assert.equal(organizations[0].discoveredFromOrganizations, true);
  assert.equal(organizations[0].inferredFromRepositories, true);
});

test("repeated discovery preserves pending, enabled, and ignored preferences", () => {
  const existingOrganizations = [
    {
      githubOwnerId: "51",
      login: "PendingOrg",
      avatarUrl: null,
      preference: "PENDING" as const,
    },
    {
      githubOwnerId: "52",
      login: "EnabledOrg",
      avatarUrl: null,
      preference: "ENABLED" as const,
    },
    {
      githubOwnerId: "53",
      login: "IgnoredOrg",
      avatarUrl: null,
      preference: "IGNORED" as const,
    },
  ];
  const organizations = existingOrganizations.map((owner) => ({
    id: Number(owner.githubOwnerId),
    login: owner.login,
  }));

  const first = discoverOrganizationCandidates({
    organizations,
    repositories: [],
    existingOrganizations,
  });
  const second = discoverOrganizationCandidates({
    organizations,
    repositories: [],
    existingOrganizations: first.map((owner) => ({
      githubOwnerId: owner.githubOwnerId,
      login: owner.login,
      avatarUrl: owner.avatarUrl,
      preference: owner.preference,
    })),
  });

  assert.deepEqual(
    second.map((owner) => owner.preference).sort(),
    ["ENABLED", "IGNORED", "PENDING"],
  );
});

test("repositories with the same name under different owners remain distinct", () => {
  const firstOwner = organizationRepository(61, 501, "First", "web");
  const secondOwner = organizationRepository(62, 502, "Second", "web");
  const duplicateFromAnotherEndpoint = {
    ...firstOwner,
    owner: { ...firstOwner.owner },
  };
  const merged = mergeRepositoriesByGithubId([
    [firstOwner, secondOwner],
    [duplicateFromAnotherEndpoint],
  ]);

  assert.deepEqual(
    merged.repositories.map((repository) => repository.id).sort(),
    [61, 62],
  );
  assert.deepEqual(merged.duplicateGithubIds, ["61"]);
});

test("owner discovery and repository merging do not mutate review or project data", () => {
  const portfolioState = {
    repositories: [
      { githubRepositoryId: "71", status: "ACCEPTED" },
      { githubRepositoryId: "72", status: "IGNORED" },
    ],
    project: {
      title: "Manually edited title",
      description: "Manually edited description",
      status: "DRAFT",
      featured: true,
    },
  };
  const before = structuredClone(portfolioState);

  discoverOrganizationCandidates({
    organizations: [{ id: 601, login: "SourceOnly" }],
    repositories: [organizationRepository(71, 601, "SourceOnly")],
    existingOrganizations: [],
  });
  mergeRepositoriesByGithubId([
    [organizationRepository(71, 601, "SourceOnly")],
  ]);

  assert.deepEqual(portfolioState, before);
});

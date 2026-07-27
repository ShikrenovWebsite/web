import assert from "node:assert/strict";
import test from "node:test";
import {
  changedRepositoryMetadataFields,
  repositoryMetadataFields,
} from "./metadata";

const metadata = {
  githubRepositoryId: "1",
  nodeId: "R_1",
  githubOwnerId: "10",
  ownerLogin: "owner",
  ownerType: "USER",
  ownerAvatarUrl: null,
  name: "project",
  fullName: "owner/project",
  description: "Description",
  githubUrl: "https://github.com/owner/project",
  homepageUrl: "https://oldsite.example",
  primaryLanguage: "TypeScript",
  topics: ["nextjs"],
  languageStatistics: { TypeScript: 1000 },
  starCount: 2,
  forkCount: 1,
  visibility: "public",
  isArchived: false,
  isFork: false,
  isTemplate: false,
  defaultBranch: "main",
  latestCommit: {
    sha: "abc",
    url: "https://github.com/owner/project/commit/abc",
    message: "Initial commit",
    authorName: "Owner",
    authorLogin: "owner",
    authoredAt: "2026-07-27T10:00:00.000Z",
  },
  githubCreatedAt: "2026-01-01T00:00:00.000Z",
  githubUpdatedAt: "2026-07-27T10:00:00.000Z",
  githubPushedAt: "2026-07-27T10:00:00.000Z",
};

test("detects a refreshed GitHub homepage URL", () => {
  assert.deepEqual(
    changedRepositoryMetadataFields(metadata, {
      ...metadata,
      homepageUrl: "https://newsite.example",
    }),
    ["homepageUrl"],
  );
});

test("tracks language statistics and latest commit metadata", () => {
  const changed = changedRepositoryMetadataFields(metadata, {
    ...metadata,
    languageStatistics: { TypeScript: 1500, CSS: 200 },
    latestCommit: {
      ...metadata.latestCommit,
      sha: "def",
      message: "Ship release",
    },
  });
  assert.deepEqual(changed, ["languageStatistics", "latestCommit"]);
});

test("treats a repository without a snapshot as fully refreshed", () => {
  assert.deepEqual(
    changedRepositoryMetadataFields(null, metadata),
    repositoryMetadataFields,
  );
});

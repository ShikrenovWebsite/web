import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateSkillEvidence,
  normalizeSkillKey,
  resolvedSuggestionState,
  skillPresentation,
} from "./normalize";

test("normalizes common technology aliases", () => {
  assert.equal(normalizeSkillKey("Next.js"), normalizeSkillKey("nextjs"));
  assert.equal(skillPresentation("node.js").displayName, "Node.js");
  assert.equal(skillPresentation("postgres").displayName, "PostgreSQL");
  assert.equal(skillPresentation("tailwind css").displayName, "Tailwind CSS");
  assert.equal(skillPresentation("GitHub Actions").category, "Infrastructure");
});

test("deduplicates repository and project evidence by normalized skill", () => {
  const suggestions = aggregateSkillEvidence([
    {
      sourceType: "GITHUB_REPOSITORY",
      sourceId: "repo-1",
      sourceName: "Org/app",
      technology: "nextjs",
      confidence: 0.95,
    },
    {
      sourceType: "PORTFOLIO_PROJECT",
      sourceId: "project-1",
      sourceName: "App",
      technology: "Next.js",
      confidence: 0.9,
    },
    {
      sourceType: "GITHUB_REPOSITORY",
      sourceId: "repo-1",
      sourceName: "Org/app",
      technology: "Next.js",
      confidence: 0.95,
    },
  ]);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].sourceCount, 2);
  assert.deepEqual(suggestions[0].sourceTypes.sort(), [
    "GITHUB_REPOSITORY",
    "PORTFOLIO_PROJECT",
  ]);
});

test("manual skills link suggestions without changing manual presentation", () => {
  const manualSkill = { id: "skill-1", name: "Next JS", category: "My category" };
  const resolution = resolvedSuggestionState({
    existingStatus: "PENDING",
    canonicalSkillId: manualSkill.id,
  });
  assert.deepEqual(resolution, { status: "ACCEPTED", skillId: "skill-1" });
  assert.deepEqual(manualSkill, {
    id: "skill-1",
    name: "Next JS",
    category: "My category",
  });
});

test("ignored and accepted decisions persist when evidence refreshes", () => {
  assert.equal(
    resolvedSuggestionState({ existingStatus: "IGNORED" }).status,
    "IGNORED",
  );
  assert.deepEqual(
    resolvedSuggestionState({
      existingStatus: "ACCEPTED",
      existingSkillId: "skill-2",
    }),
    { status: "ACCEPTED", skillId: "skill-2" },
  );
});

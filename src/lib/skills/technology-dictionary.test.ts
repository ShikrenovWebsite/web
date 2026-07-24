import assert from "node:assert/strict";
import test from "node:test";
import {
  detectTechnologies,
  TECHNOLOGY_DICTIONARY_SIZE,
} from "./technology-dictionary";
import { normalizeSkillKey } from "./normalize";

test("detects and deduplicates technologies across aliases and prose", () => {
  const detected = detectTechnologies(
    "Built React.js and ReactJS interfaces with Next.js, TypeScript, Prisma and PostgreSQL. Deployed Docker containers through GitHub Actions.",
  );
  const names = detected.map((item) => item.name);
  assert.equal(names.filter((name) => name === "React").length, 1);
  for (const expected of [
    "React",
    "Next.js",
    "TypeScript",
    "Prisma",
    "PostgreSQL",
    "Docker",
    "GitHub Actions",
  ]) {
    assert.ok(names.includes(expected), `${expected} was not detected`);
  }
});

test("technology aliases share one normalized skill identity", () => {
  assert.equal(normalizeSkillKey("React.js"), normalizeSkillKey("ReactJS"));
  assert.equal(normalizeSkillKey("Postgres"), normalizeSkillKey("PostgreSQL"));
  assert.equal(normalizeSkillKey("Next JS"), normalizeSkillKey("Next.js"));
});

test("dictionary covers a broad modern technology set", () => {
  assert.ok(TECHNOLOGY_DICTIONARY_SIZE >= 250);
});

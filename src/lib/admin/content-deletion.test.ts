import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteOwnedContentRecord,
  pruneDeletedRecordFromPublication,
} from "./content-deletion";
import { deleteContentSchema } from "../validations/content";

function mockDatabase(records: Record<string, Set<string>>) {
  const model = (type: string) => ({
    async deleteMany({
      where,
    }: {
      where: { id: string; userId: string };
    }) {
      const key = `${where.userId}:${where.id}`;
      const found = records[type]?.delete(key) ?? false;
      return { count: found ? 1 : 0 };
    },
  });
  return {
    portfolioProfile: model("profile"),
    experience: model("experience"),
    education: model("education"),
    skill: model("skill"),
    portfolioProject: model("project"),
  };
}

test("seeded example record IDs are valid deletion inputs", () => {
  assert.equal(
    deleteContentSchema.safeParse({
      type: "experience",
      id: "seed-experience-product-engineer",
    }).success,
    true,
  );
  assert.equal(
    deleteContentSchema.safeParse({
      type: "education",
      id: "seed-education-computer-science",
    }).success,
    true,
  );
});

test("an owner can delete seeded experience and education records", async () => {
  const records = {
    experience: new Set(["owner:seed-experience-product-engineer"]),
    education: new Set(["owner:seed-education-computer-science"]),
  };
  const database = mockDatabase(records);

  const experience = await deleteOwnedContentRecord(database, {
    type: "experience",
    id: "seed-experience-product-engineer",
    userId: "owner",
  });
  const education = await deleteOwnedContentRecord(database, {
    type: "education",
    id: "seed-education-computer-science",
    userId: "owner",
  });

  assert.equal(experience.count, 1);
  assert.equal(education.count, 1);
  assert.equal(records.experience.size, 0);
  assert.equal(records.education.size, 0);
});

test("owner scoping rejects deletion of another user's record", async () => {
  const records = {
    experience: new Set(["other:seed-experience-product-engineer"]),
  };
  const result = await deleteOwnedContentRecord(mockDatabase(records), {
    type: "experience",
    id: "seed-experience-product-engineer",
    userId: "owner",
  });

  assert.equal(result.count, 0);
  assert.equal(records.experience.has("other:seed-experience-product-engineer"), true);
});

test("invalid placeholder IDs are rejected before deletion", () => {
  assert.equal(
    deleteContentSchema.safeParse({
      type: "education",
      id: "../../../another-user",
    }).success,
    false,
  );
});

test("deleted records are removed from the current public snapshot", () => {
  const publication = {
    experiences: [
      { id: "seed-experience-product-engineer", company: "Example Studio" },
      { id: "other-experience", company: "Real Studio" },
    ],
    education: [
      { id: "seed-education-computer-science", institution: "Example University" },
    ],
    skills: [],
    projects: [],
  };

  const withoutExperience = pruneDeletedRecordFromPublication(
    publication,
    "experience",
    "seed-experience-product-engineer",
  );
  const withoutEducation = pruneDeletedRecordFromPublication(
    withoutExperience.data,
    "education",
    "seed-education-computer-science",
  );

  assert.equal(withoutExperience.changed, true);
  assert.deepEqual(
    (withoutEducation.data as typeof publication).experiences.map(
      (item) => item.id,
    ),
    ["other-experience"],
  );
  assert.deepEqual(
    (withoutEducation.data as typeof publication).education,
    [],
  );
});

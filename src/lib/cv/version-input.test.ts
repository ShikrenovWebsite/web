import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateUniqueCvVersionName,
  createCvVersionForPreview,
  cvVersionSavedMessage,
  cvPreviewPath,
  cvVersionInputSchema,
  cvVersionUpdateInputSchema,
  databaseCuidSchema,
  resolveCvVersionSelections,
  suggestUniqueCvVersionName,
} from "./version-input";

const firstId = "cmryr6tin0001jdw7gj9r6ggf";
const secondId = "cmryr6tin0002jdw7gj9r6ggh";

function input(name: string) {
  return {
    name,
    customHeadline: "",
    customSummary: "",
    selectedExperienceIds: ["cmryr6tin0001jdw7gj9r6ggf"],
    selectedProjectIds: ["cmrxyiuwi001kpww739b5183n"],
    selectedEducationIds: ["seed-education-computer-science"],
    selectedSkillIds: ["cmrxm14yu0003uxw7nt849jcd"],
    selectedCertificationIds: [],
    selectedLanguageIds: [],
    contactFields: ["email"],
    sectionOrder: ["experience", "projects", "education", "skills"],
    overridesJson: "{}",
  };
}

test("creating the first CV waits for its database CUID before previewing", async () => {
  let created = false;
  const result = await createCvVersionForPreview(async () => {
    created = true;
    return { id: firstId };
  });
  assert.equal(created, true);
  assert.deepEqual(result, {
    id: firstId,
    previewPath: `/admin/cv/${firstId}/preview`,
  });
});

test("creating multiple CV versions produces distinct preview routes", async () => {
  const ids = [firstId, secondId];
  const results = [];
  for (const id of ids) {
    results.push(
      await createCvVersionForPreview(async () => ({
        id,
      })),
    );
  }
  assert.deepEqual(
    results.map((result) => result.previewPath),
    ids.map((id) => `/admin/cv/${id}/preview`),
  );
});

test("create payload accepts real legacy portfolio IDs but CV IDs stay CUIDs", () => {
  assert.equal(cvVersionInputSchema.safeParse(input("General")).success, true);
  assert.equal(
    cvVersionInputSchema.safeParse({
      ...input("Existing"),
      id: firstId,
    }).success,
    true,
  );
});

test("metadata-only CV updates may omit selections without clearing them", () => {
  const parsed = cvVersionUpdateInputSchema.parse({
    id: firstId,
    name: "Refined CV",
    customHeadline: "Product-minded software engineer",
    customSummary: "",
    contactFields: ["email"],
    sectionOrder: ["experience", "projects", "education", "skills"],
    overridesJson: "{}",
  });
  const existing = {
    selectedExperienceIds: ["legacy-experience"],
    selectedProjectIds: ["legacy-project"],
    selectedEducationIds: ["legacy-education"],
    selectedSkillIds: ["legacy-skill"],
    selectedCertificationIds: ["legacy-certification"],
    selectedLanguageIds: ["legacy-language"],
  };

  const resolved = resolveCvVersionSelections(existing, parsed);
  assert.deepEqual(resolved.selections, existing);
  assert.deepEqual(resolved.submittedSelectionFields, []);
});

test("explicit selection arrays update only their own CV section, including intentional empties", () => {
  const existing = {
    selectedExperienceIds: ["experience-1"],
    selectedProjectIds: ["project-1"],
    selectedEducationIds: ["education-1"],
    selectedSkillIds: ["skill-1"],
    selectedCertificationIds: ["certification-1"],
    selectedLanguageIds: ["language-1"],
  };
  const parsed = cvVersionUpdateInputSchema.parse({
    id: firstId,
    name: "General",
    customHeadline: "",
    customSummary: "",
    selectedSkillIds: [],
    contactFields: ["email"],
    sectionOrder: ["experience"],
    overridesJson: "{}",
  });

  const resolved = resolveCvVersionSelections(existing, parsed);
  assert.deepEqual(resolved.selections.selectedSkillIds, []);
  assert.deepEqual(resolved.selections.selectedExperienceIds, ["experience-1"]);
  assert.deepEqual(resolved.submittedSelectionFields, ["selectedSkillIds"]);
});

test("existing preview routes accept a database CUID", () => {
  assert.equal(cvPreviewPath(firstId), `/admin/cv/${firstId}/preview`);
});

test("invalid and missing route IDs fail before a database query", () => {
  for (const id of ["new", "create", "preview", "", undefined, null]) {
    assert.equal(databaseCuidSchema.safeParse(id).success, false);
  }
  assert.throws(() => cvPreviewPath("new"));
});

test("the first CV keeps its requested name", () => {
  assert.equal(suggestUniqueCvVersionName("General CV", []), "General CV");
});

test("duplicate CV names receive deterministic numeric suffixes", () => {
  assert.equal(
    suggestUniqueCvVersionName("General CV", ["General CV"]),
    "General CV (2)",
  );
  assert.equal(
    suggestUniqueCvVersionName("General CV", [
      "General CV",
      "General CV (2)",
    ]),
    "General CV (3)",
  );
  assert.equal(
    suggestUniqueCvVersionName("Full Stack Developer", [
      "Full Stack Developer",
      "Full Stack Developer (2)",
    ]),
    "Full Stack Developer (3)",
  );
});

test("concurrent creation attempts allocate distinct names", async () => {
  const names = new Set<string>();
  let queue = Promise.resolve();
  const exclusive = async <T>(operation: () => Promise<T>) => {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  const results = await Promise.all(
    Array.from({ length: 3 }, () =>
      allocateUniqueCvVersionName({
        requestedName: "General CV",
        exclusive,
        listExistingNames: async () => [...names],
        create: async (name) => {
          names.add(name);
          return name;
        },
      }),
    ),
  );
  assert.deepEqual(
    results.map((result) => result.name),
    ["General CV", "General CV (2)", "General CV (3)"],
  );
});

test("renamed versions return a friendly validation message", () => {
  assert.equal(
    cvVersionSavedMessage("General CV", "General CV (2)", true),
    'A CV version with this name already exists. Created as "General CV (2)".',
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  cvItemSection,
  cvReviewChangeKind,
  requiredContactFields,
  requiredCvFields,
  suggestedBulkResolution,
} from "./review";

test("review items are grouped into the six portfolio sections", () => {
  assert.equal(cvItemSection("PROFILE"), "PROFILE");
  assert.equal(cvItemSection("EXPERIENCE"), "EXPERIENCE");
  assert.equal(cvItemSection("EDUCATION"), "EDUCATION");
  assert.equal(cvItemSection("PROJECT"), "PROJECTS");
  assert.equal(cvItemSection("SKILL"), "SKILLS");
  assert.equal(cvItemSection("CERTIFICATION"), "SKILLS");
});

test("required fields are explicit and section-specific", () => {
  assert.deepEqual(requiredCvFields("PROFILE", {}), [
    "Name",
    "Headline",
    "Email",
  ]);
  assert.deepEqual(
    requiredCvFields("EXPERIENCE", {
      company: "Example",
      role: "",
      startDate: null,
    }),
    ["Position", "Start date"],
  );
  assert.deepEqual(requiredCvFields("EDUCATION", { institution: "School" }), [
    "Degree",
  ]);
  assert.deepEqual(requiredCvFields("PROJECT", { title: "Project" }), []);
  assert.deepEqual(requiredContactFields({ email: "" }), ["Email"]);
});

test("bulk accept merges matches and creates new records", () => {
  assert.equal(
    suggestedBulkResolution({ itemType: "PROJECT", existingRecordId: "one" }),
    "MERGE",
  );
  assert.equal(
    suggestedBulkResolution({ itemType: "PROJECT", existingRecordId: null }),
    "CREATE_NEW",
  );
});

test("change indicators distinguish new, modified, and unchanged items", () => {
  assert.equal(
    cvReviewChangeKind({ importedData: { title: "A" } }),
    "NEW",
  );
  assert.equal(
    cvReviewChangeKind({
      existingRecordId: "one",
      importedData: { title: "A" },
      existingData: { title: "A" },
    }),
    "UNCHANGED",
  );
  assert.equal(
    cvReviewChangeKind({
      existingRecordId: "one",
      importedData: { title: "B" },
      existingData: { title: "A" },
    }),
    "MODIFIED",
  );
});

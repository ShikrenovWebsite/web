import assert from "node:assert/strict";
import test from "node:test";
import {
  educationCvIssues,
  experienceCvIssues,
  profileCvIssues,
  projectCvIssues,
  skillCvIssues,
} from "./readiness";

test("marks complete CV records as ready", () => {
  assert.deepEqual(
    profileCvIssues({
      fullName: "Petar Shikrenov",
      professionalTitle: "Full-stack Developer",
      email: "petar@example.com",
    }),
    [],
  );
  assert.deepEqual(
    experienceCvIssues({
      company: "Example",
      role: "Engineer",
      startDate: new Date(),
      isCurrent: true,
    }),
    [],
  );
  assert.deepEqual(
    educationCvIssues({ institution: "University", qualification: "BSc" }),
    [],
  );
  assert.deepEqual(
    projectCvIssues({ title: "Portfolio", shortDescription: "A portfolio." }),
    [],
  );
  assert.deepEqual(skillCvIssues({ name: "TypeScript" }), []);
});

test("explains why incomplete records are not ready", () => {
  assert.deepEqual(profileCvIssues({}), [
    "Name is missing",
    "Headline is missing",
    "Contact information is missing",
  ]);
  assert.deepEqual(
    experienceCvIssues({
      company: "",
      role: "",
      startDate: null,
      endDate: null,
      isCurrent: false,
    }),
    [
      "Company is missing",
      "Role is missing",
      "Start date is missing",
      "End date is missing",
    ],
  );
  assert.deepEqual(educationCvIssues({}), [
    "Institution is missing",
    "Degree is missing",
  ]);
  assert.deepEqual(projectCvIssues({}), [
    "Title is missing",
    "Summary is missing",
  ]);
});

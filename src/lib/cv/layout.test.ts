import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultCompactCvSelection,
  estimateCompactCvFit,
} from "./layout";

function options(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `record-${index}`,
    issues: [] as string[],
  }));
}

test("new compact CVs select a focused set of complete records", () => {
  const selection = defaultCompactCvSelection({
    experience: options(6),
    projects: options(8),
    education: options(3),
    skills: options(30),
    certifications: options(4),
    languages: options(4),
  });
  assert.equal(selection.experience.length, 2);
  assert.equal(selection.projects.length, 2);
  assert.equal(selection.education.length, 1);
  assert.equal(selection.skills.length, 14);
  assert.equal(selection.certifications.length, 2);
  assert.equal(selection.languages.length, 2);
});

test("incomplete records are excluded from compact CV defaults", () => {
  const selection = defaultCompactCvSelection({
    experience: [
      { id: "incomplete", issues: ["Role is missing"] },
      { id: "ready", issues: [] },
    ],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
  });
  assert.deepEqual(selection.experience, ["ready"]);
});

test("fit estimate warns instead of shrinking an overloaded CV", () => {
  const fit = estimateCompactCvFit({
    summary: "Summary ".repeat(200),
    experience: Array.from({ length: 5 }, () => ({
      description: "Description ".repeat(80),
      highlights: ["Achievement ".repeat(50)],
    })),
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
  });
  assert.equal(fit.fitsOnePage, false);
  assert.ok(fit.likelyPages >= 2);
});

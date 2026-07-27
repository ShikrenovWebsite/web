import assert from "node:assert/strict";
import test from "node:test";
import {
  githubProjectDifferenceFields,
  githubProjectValues,
} from "./project-updates";

const repository = {
  name: "calistheni-app",
  description: "Training platform",
  githubUrl: "https://github.com/Calistheni/calistheni-app",
  homepageUrl: "https://calistheni.app",
  primaryLanguage: "TypeScript",
  topics: ["fitness"],
  readmePreview: "README summary",
  detectedTechnologies: ["TypeScript", "Next.js"],
  suggestedTitle: "Calistheni",
  suggestedShortDescription: "Train with intent",
  suggestedLongDescription: "A structured training platform.",
  suggestedCoverImageUrl: null,
};

test("keeps synchronized source data separate from portfolio edits", () => {
  const project = {
    ...githubProjectValues(repository),
    shortDescription: "Manual portfolio copy",
    liveUrl: "https://calistheni-app.vercel.app",
  };

  assert.deepEqual(githubProjectDifferenceFields(project, repository), [
    "shortDescription",
    "liveUrl",
  ]);
  assert.equal(project.liveUrl, "https://calistheni-app.vercel.app");
  assert.equal(
    githubProjectValues(repository).liveUrl,
    "https://calistheni.app",
  );
});

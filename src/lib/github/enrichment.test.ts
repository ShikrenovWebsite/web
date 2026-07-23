import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeRepositoryContents,
  extractReadmeImages,
  type RepositoryContentFile,
} from "./enrichment";

const context = {
  owner: "ExampleOrg",
  name: "portfolio-platform",
  defaultBranch: "main",
  description: "A production portfolio platform.",
  primaryLanguage: "TypeScript",
  topics: ["accessibility"],
};

const files: RepositoryContentFile[] = [
  {
    path: "package.json",
    sha: "package-sha",
    size: 300,
    content: JSON.stringify({
      name: "portfolio-platform",
      packageManager: "pnpm@10.0.0",
      dependencies: {
        next: "16.0.0",
        react: "19.0.0",
        "@prisma/client": "7.0.0",
        pg: "8.0.0",
      },
      devDependencies: {
        tailwindcss: "4.0.0",
        playwright: "1.0.0",
      },
    }),
  },
  {
    path: "pnpm-lock.yaml",
    sha: "lock-sha",
    size: 50,
    content: "lockfileVersion: '9.0'",
  },
  {
    path: "Dockerfile",
    sha: "docker-sha",
    size: 20,
    content: "FROM node:22",
  },
  {
    path: ".github/workflows/verify.yml",
    sha: "workflow-sha",
    size: 30,
    content: "name: Verify",
  },
  {
    path: "vercel.json",
    sha: "vercel-sha",
    size: 2,
    content: "{}",
  },
  {
    path: "prisma/schema.prisma",
    sha: "prisma-sha",
    size: 80,
    content: 'datasource db { provider = "postgresql" }',
  },
];

test("detects repository technologies and creates portfolio suggestions", () => {
  const result = analyzeRepositoryContents({
    context,
    files,
    readmeMarkdown:
      "# Portfolio Platform\n\nA polished administration and public portfolio experience.\n\n![Dashboard](docs/dashboard.png)",
  });

  assert.deepEqual(
    [
      "Next.js",
      "React",
      "Tailwind CSS",
      "Prisma",
      "PostgreSQL",
      "GitHub Actions",
      "Vercel",
      "pnpm",
      "Docker",
      "Playwright",
    ].filter((technology) =>
      result.detectedTechnologies.includes(technology),
    ),
    [
      "Next.js",
      "React",
      "Tailwind CSS",
      "Prisma",
      "PostgreSQL",
      "GitHub Actions",
      "Vercel",
      "pnpm",
      "Docker",
      "Playwright",
    ],
  );
  assert.equal(result.suggestions.title, "Portfolio Platform");
  assert.equal(
    result.suggestions.shortDescription,
    "A production portfolio platform.",
  );
  assert.match(result.suggestions.longDescription ?? "", /polished/i);
  assert.equal(
    result.suggestions.coverImageUrl,
    "https://raw.githubusercontent.com/ExampleOrg/portfolio-platform/main/docs/dashboard.png",
  );
});

test("README cover discovery rejects badges and unsafe image URLs", () => {
  const images = extractReadmeImages(
    [
      "![Screenshot](./assets/screenshot.png)",
      "![Build](https://img.shields.io/badge/build-passing.svg)",
      '<img src="javascript:alert(1)" alt="unsafe">',
      '<img src="https://cdn.example.com/demo.jpg" alt="Demo">',
    ].join("\n"),
    context,
  );

  assert.deepEqual(
    images.map((image) => image.url),
    [
      "https://raw.githubusercontent.com/ExampleOrg/portfolio-platform/main/assets/screenshot.png",
      "https://cdn.example.com/demo.jpg",
    ],
  );
});

test("analysis is deterministic and does not mutate editable project data", () => {
  const editableProject = {
    title: "My custom title",
    shortDescription: "Manually written",
    technologies: ["Hand-picked"],
    status: "PUBLISHED",
    displayOrder: 7,
  };
  const before = structuredClone(editableProject);
  const first = analyzeRepositoryContents({
    context,
    files,
    readmeMarkdown: "# Project\n\nA useful project description for visitors.",
  });
  const second = analyzeRepositoryContents({
    context,
    files,
    readmeMarkdown: "# Project\n\nA useful project description for visitors.",
  });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(editableProject, before);
});

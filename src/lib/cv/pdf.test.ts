import assert from "node:assert/strict";
import test from "node:test";
import { PDFParse } from "pdf-parse";
import { cvFilename, generateCvPdf } from "./pdf";
import type { CvDocumentData } from "./document";

test("generates a selectable multi-page A4 PDF with a sensible filename", async () => {
  const data: CvDocumentData = {
    version: {
      id: "version-1",
      name: "Full Stack Developer",
      headline: "Full Stack Developer",
      summary: "Production-minded engineer.",
      sectionOrder: ["experience", "projects", "education", "skills"],
      updatedAt: new Date(0).toISOString(),
      sourceUpdatedAt: new Date(0).toISOString(),
      newerDataAvailable: false,
      layoutMode: "COMPACT_ONE_PAGE",
      fit: { pressure: 10_000, likelyPages: 3, fitsOnePage: false },
    },
    profile: {
      fullName: "Petar Shikrenov",
      email: "petar@example.com",
      phone: "+359 000 000",
      location: "Sofia, Bulgaria",
      website: "https://example.com",
      links: ["https://github.com/Shikrenov"],
    },
    experience: Array.from({ length: 35 }, (_, index) => ({
      id: `experience-${index}`,
      company: `Company ${index}`,
      role: "Software Engineer",
      location: "Remote",
      startDate: "Jan 2020",
      endDate: "Present",
      description:
        "Built reliable applications with accessible interfaces and secure server-side data workflows.",
      highlights: [
        "Delivered production features with automated validation and deployment.",
        "Collaborated across product, design, and engineering.",
      ],
    })),
    projects: [],
    education: [],
    skills: [
      { id: "skill-1", name: "TypeScript", category: "Languages" },
      { id: "skill-2", name: "Next.js", category: "Frontend" },
    ],
    certifications: [],
    languages: [],
    canonicalUpdatedAt: new Date(0).toISOString(),
  };
  const result = await generateCvPdf(data);
  assert.ok(result.pageCount > 1);
  assert.equal(
    cvFilename(data.profile.fullName, data.version.name),
    "Full-Stack-Developer-CV.pdf",
  );
  const parser = new PDFParse({ data: new Uint8Array(result.bytes) });
  const extracted = await parser.getText();
  await parser.destroy();
  assert.match(extracted.text, /Petar Shikrenov/);
  assert.match(extracted.text, /Software Engineer/);
});

test("fits a focused realistic CV on one selectable-text A4 page", async () => {
  const data: CvDocumentData = {
    version: {
      id: "version-focused",
      name: "Full Stack Developer",
      headline: "Full Stack Developer",
      summary:
        "Product-minded engineer building reliable web applications with TypeScript, React, and PostgreSQL.",
      sectionOrder: ["experience", "projects", "education", "skills"],
      updatedAt: new Date(0).toISOString(),
      sourceUpdatedAt: new Date(0).toISOString(),
      newerDataAvailable: false,
      layoutMode: "COMPACT_ONE_PAGE",
      fit: { pressure: 2_500, likelyPages: 1, fitsOnePage: true },
    },
    profile: {
      fullName: "Petar Shikrenov",
      email: "petar@example.com",
      phone: "+359 000 000",
      location: "Sofia, Bulgaria",
      website: "https://example.com",
      links: ["https://github.com/Shikrenov"],
    },
    experience: Array.from({ length: 2 }, (_, index) => ({
      id: `experience-${index}`,
      company: `Product Company ${index + 1}`,
      role: "Software Engineer",
      location: "Remote",
      startDate: "Jan 2022",
      endDate: index ? "Dec 2023" : "Present",
      description: "Built and maintained customer-facing product capabilities.",
      highlights: [
        "Delivered accessible features with validated server-side workflows.",
        "Improved reliability through automated tests and deployment checks.",
      ],
    })),
    projects: Array.from({ length: 2 }, (_, index) => ({
      id: `project-${index}`,
      title: `Selected Project ${index + 1}`,
      shortDescription: "A production web application for real users.",
      longDescription: "",
      technologies: ["Next.js", "TypeScript", "PostgreSQL"],
      highlights: ["Designed and delivered the end-to-end application."],
      liveUrl: "https://example.com",
      sourceCodeUrl: "https://github.com/Shikrenov/example",
    })),
    education: [
      {
        id: "education-1",
        institution: "Technical University",
        qualification: "BSc",
        fieldOfStudy: "Computer Science",
        startDate: "Sep 2017",
        endDate: "Jun 2021",
        description: "",
      },
    ],
    skills: [
      { id: "skill-1", name: "TypeScript", category: "Languages" },
      { id: "skill-2", name: "Next.js", category: "Frontend" },
      { id: "skill-3", name: "PostgreSQL", category: "Databases" },
      { id: "skill-4", name: "Docker", category: "Infrastructure" },
    ],
    certifications: [],
    languages: [
      { id: "language-1", name: "English", proficiency: "Professional" },
    ],
    canonicalUpdatedAt: new Date(0).toISOString(),
  };

  const result = await generateCvPdf(data);
  assert.equal(result.pageCount, 1);
  const parser = new PDFParse({ data: new Uint8Array(result.bytes) });
  const extracted = await parser.getText();
  await parser.destroy();
  assert.match(extracted.text, /Selected Project 2/);
  assert.match(extracted.text, /Technical University/);
  assert.ok(
    extracted.text.indexOf("Selected Project 2") <
      extracted.text.indexOf("Technical University"),
  );
  assert.match(extracted.text, /TypeScript \| Next\.js \| PostgreSQL/);
});

test("exports a CV when portfolio text includes unsupported emoji", async () => {
  const data: CvDocumentData = {
    version: {
      id: "version-emoji",
      name: "Software Engineer",
      headline: "Product-minded software engineer",
      summary: "Building reliable products.",
      sectionOrder: ["skills"],
      updatedAt: new Date(0).toISOString(),
      sourceUpdatedAt: new Date(0).toISOString(),
      newerDataAvailable: false,
      layoutMode: "COMPACT_ONE_PAGE",
      fit: { pressure: 0, likelyPages: 1, fitsOnePage: true },
    },
    profile: {
      fullName: "Petar Shikrenov",
      email: "petar@example.com",
      phone: "",
      location: "🗺 Sofia, Bulgaria",
      website: "",
      links: [],
    },
    experience: [],
    projects: [],
    education: [],
    skills: [{ id: "skill-1", name: "TypeScript", category: "Languages" }],
    certifications: [],
    languages: [],
    canonicalUpdatedAt: new Date(0).toISOString(),
  };

  const result = await generateCvPdf(data);
  assert.ok(result.bytes.byteLength > 0);
});

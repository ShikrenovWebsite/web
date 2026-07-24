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
    "petar-shikrenov-full-stack-developer-cv.pdf",
  );
  const parser = new PDFParse({ data: new Uint8Array(result.bytes) });
  const extracted = await parser.getText();
  await parser.destroy();
  assert.match(extracted.text, /Petar Shikrenov/);
  assert.match(extracted.text, /Software Engineer/);
});

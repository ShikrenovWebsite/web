import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractCvText, CvExtractionError } from "./extract";
import {
  educationMatchScore,
  experienceMatchScore,
  projectMatchScore,
  skillMatches,
} from "./matching";
import { parseCvText } from "./parser";
import { cvStructuredDraftSchema } from "./schema";
import {
  DOCX_MIME,
  MAX_CV_FILE_SIZE,
  PDF_MIME,
  validateCvFile,
  CvUploadValidationError,
} from "./upload";

async function pdfFixture(text: string) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  document.addPage().drawText(text, { x: 40, y: 760, font, size: 11 });
  return Buffer.from(await document.save());
}

async function docxFixture(text: string) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`,
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>
    </w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

test("validates and extracts a text PDF", async () => {
  const data = await pdfFixture(
    "Petar Shikrenov Full Stack Developer with production portfolio experience and modern TypeScript skills.",
  );
  assert.equal(
    (await validateCvFile({ name: "cv.pdf", declaredMime: PDF_MIME, data }))
      .mimeType,
    PDF_MIME,
  );
  const result = await extractCvText(data, PDF_MIME);
  assert.match(result.text, /Petar Shikrenov/);
  assert.equal(result.pageCount, 1);
});

test("validates and extracts a DOCX", async () => {
  const data = await docxFixture(
    "Petar Shikrenov - Full Stack Developer with extensive portfolio experience and TypeScript expertise.",
  );
  assert.equal(
    (await validateCvFile({ name: "cv.docx", declaredMime: DOCX_MIME, data }))
      .mimeType,
    DOCX_MIME,
  );
  const result = await extractCvText(data, DOCX_MIME);
  assert.match(result.text, /Full Stack Developer/);
});

test("rejects invalid MIME, oversized, corrupted, and insufficient files", async () => {
  const pdf = await pdfFixture("short");
  await assert.rejects(
    validateCvFile({ name: "cv.pdf", declaredMime: "text/plain", data: pdf }),
    (error: unknown) =>
      error instanceof CvUploadValidationError &&
      error.code === "INVALID_MIME",
  );
  await assert.rejects(
    validateCvFile({
      name: "cv.pdf",
      declaredMime: PDF_MIME,
      data: Buffer.alloc(MAX_CV_FILE_SIZE + 1),
    }),
    (error: unknown) =>
      error instanceof CvUploadValidationError &&
      error.code === "FILE_TOO_LARGE",
  );
  await assert.rejects(
    validateCvFile({
      name: "cv.pdf",
      declaredMime: PDF_MIME,
      data: Buffer.from("not a pdf"),
    }),
    (error: unknown) =>
      error instanceof CvUploadValidationError &&
      error.code === "SIGNATURE_MISMATCH",
  );
  await assert.rejects(
    extractCvText(pdf, PDF_MIME),
    (error: unknown) =>
      error instanceof CvExtractionError &&
      error.code === "INSUFFICIENT_TEXT",
  );
});

test("parses a validated structured draft without inventing absent fields", () => {
  const draft = parseCvText(`Petar Shikrenov
Full Stack Developer
petar@example.com
https://github.com/Shikrenov

Summary
Production-minded software developer.

Skills
Next.js, TypeScript, PostgreSQL, nextjs

Projects
Calistheni
Find outdoor parks and track workouts.
https://github.com/Calistheni/calistheni-app
`);
  assert.equal(draft.profile.fullName, "Petar Shikrenov");
  assert.equal(draft.profile.email, "petar@example.com");
  assert.equal(
    draft.skills.filter((skill) => skill.name === "Next.js").length,
    1,
  );
  assert.equal(draft.projects[0].title, "Calistheni");
  assert.equal(draft.profile.location, "");
  assert.equal(cvStructuredDraftSchema.safeParse(draft).success, true);
  assert.equal(
    cvStructuredDraftSchema.safeParse({ profile: { fullName: 42 } }).success,
    false,
  );
});

test("detects conservative experience, education, skill, and GitHub project matches", () => {
  assert.ok(
    experienceMatchScore(
      {
        company: "Example Ltd",
        role: "Engineer",
        startDate: "2024-01",
        endDate: "2025-01",
      },
      {
        company: "example ltd.",
        role: "Engineer",
        startDate: "2024-02",
        endDate: "2025-02",
      },
    ) >= 0.9,
  );
  assert.ok(
    educationMatchScore(
      { institution: "Sofia University", degree: "BSc" },
      { institution: "Sofia University", qualification: "BSc" },
    ) >= 0.75,
  );
  assert.equal(skillMatches("postgres", "PostgreSQL"), true);
  assert.ok(
    projectMatchScore(
      {
        title: "Calistheni",
        sourceUrl: "https://github.com/Calistheni/calistheni-app",
      },
      {
        title: "Calistheni App",
        sourceCodeUrl: "https://github.com/Calistheni/calistheni-app",
        githubFullName: "Calistheni/calistheni-app",
      },
    ) >= 0.65,
  );
});

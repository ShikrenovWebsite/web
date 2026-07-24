import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PasswordException } from "pdf-parse";
import {
  classifyPdfExtractionError,
  extractCvText,
  CvExtractionError,
} from "./extract";
import {
  educationMatchScore,
  experienceMatchScore,
  projectMatchScore,
  skillMatches,
} from "./matching";
import { detectCvSections, parseCvDocument, parseCvText } from "./parser";
import { cvStructuredDraftSchema } from "./schema";
import { groupPublishableCvRecordIds } from "./publication";
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

test("reports a readable image-only PDF as scanned", async () => {
  const document = await PDFDocument.create();
  document.addPage();
  const data = Buffer.from(await document.save());
  await assert.rejects(
    extractCvText(data, PDF_MIME),
    (error: unknown) =>
      error instanceof CvExtractionError && error.code === "SCANNED_PDF",
  );
});

test("reports an encrypted PDF distinctly", () => {
  const classified = classifyPdfExtractionError(
    new PasswordException("No password given"),
  );
  assert.equal(classified.code, "ENCRYPTED_PDF");
  assert.match(classified.message, /encrypted|password-protected/i);
  assert.equal(
    classified.cause instanceof Error ? classified.cause.message : "",
    "No password given",
  );
});

test("rejects empty and invalid PDF uploads before extraction", async () => {
  await assert.rejects(
    validateCvFile({
      name: "empty.pdf",
      declaredMime: PDF_MIME,
      data: Buffer.alloc(0),
    }),
    (error: unknown) =>
      error instanceof CvUploadValidationError && error.code === "EMPTY_FILE",
  );
  await assert.rejects(
    validateCvFile({
      name: "invalid.pdf",
      declaredMime: PDF_MIME,
      data: Buffer.from("not a pdf"),
    }),
    (error: unknown) =>
      error instanceof CvUploadValidationError &&
      error.code === "SIGNATURE_MISMATCH",
  );
});

test("reports a truncated PDF as structurally corrupted", async () => {
  const complete = await pdfFixture(
    "A complete text PDF that will be deliberately truncated for this regression test.",
  );
  const truncated = complete.subarray(0, Math.floor(complete.length / 2));
  await assert.rejects(
    extractCvText(truncated, PDF_MIME),
    (error: unknown) =>
      error instanceof CvExtractionError && error.code === "CORRUPTED_PDF",
  );
});

test("reports a PDF-shaped invalid document distinctly", async () => {
  await assert.rejects(
    extractCvText(
      Buffer.from("%PDF-1.7\nThis is not a PDF object graph.\n%%EOF\n"),
      PDF_MIME,
    ),
    (error: unknown) =>
      error instanceof CvExtractionError && error.code === "INVALID_PDF",
  );
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

test("rejects invalid MIME, oversized, and insufficient files", async () => {
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
      error.code === "SCANNED_PDF",
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

test("preserves multi-page section boundaries and multiple employment records", () => {
  const result = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Alex Example
Software Engineer
alex@example.com

Professional Experience
Senior Software Engineer
Example Products Ltd
Jan 2022 - Present
- Led delivery of accessible web applications.
- Improved deployment reliability.

Software Developer
Previous Systems Inc
Mar 2020 - Dec 2021
- Built typed backend services.`,
      },
      {
        pageNumber: 2,
        text: `Academic Background
Example University
BSc Computer Science
2016 - 2020
- Graduated with honours.

Technical Skills
TypeScript, React, PostgreSQL

Personal Projects
Open Source Toolkit
Reusable developer tooling.
https://github.com/example/toolkit`,
      },
    ],
  });
  assert.equal(result.diagnostics.pageCount, 2);
  assert.equal(result.diagnostics.truncated, false);
  assert.equal(result.draft.experience.length, 2);
  assert.equal(result.draft.education.length, 1);
  assert.equal(result.draft.projects.length, 1);
  assert.equal(result.draft.skills.length, 3);
  assert.equal(result.draft.experience[1].company, "Previous Systems Inc");
  assert.equal(result.draft.education[0].institution, "Example University");
  assert.ok(
    result.itemMetadata.every(
      (item) => item.sourcePage >= 1 && item.confidence > 0,
    ),
  );
});

test("handles a serialized two-column CV without crossing section boundaries", () => {
  const result = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Taylor Example
Full-stack Developer

Tech Stack
Next.js\tTypeScript\tDocker
Education
Example Technical University
MSc Software Engineering
2018 - 2020
Summary
Product-focused engineer.
Experience`,
      },
      {
        pageNumber: 2,
        text: `Lead Developer
Example Studio
2021 - Present
- Delivered production systems.`,
      },
    ],
  });
  assert.equal(result.draft.experience.length, 1);
  assert.equal(result.draft.education.length, 1);
  assert.ok(result.draft.skills.some((skill) => skill.name === "Next.js"));
  assert.doesNotMatch(
    result.draft.education[0].description,
    /Lead Developer|Example Studio/,
  );
});

test("recovers academic and employment blocks displaced by two-column reading order", () => {
  const result = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Casey Example
Software Developer
2016 - 2020
Example Technical University
BSc Computer Science

Education
Senior Software Engineer
Example Products Ltd
01/2022 - Present
- Led a platform migration.

Experience
Software Developer
Previous Systems Inc
03/2020 - 12/2021
- Built backend services.`,
      },
    ],
  });
  assert.equal(result.draft.education.length, 1);
  assert.equal(
    result.draft.education[0].institution,
    "Example Technical University",
  );
  assert.equal(result.draft.experience.length, 2);
  assert.ok(
    result.itemMetadata.some(
      (item) =>
        item.itemType === "EXPERIENCE" &&
        item.sourceSection === "education" &&
        item.confidence < 0.75 &&
        item.warnings.length > 0,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(result.draft.education),
    /Example Products Ltd/,
  );
});

test("retains paragraphs outside detected item ranges for manual review", () => {
  const result = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Riley Example
Developer

Education
Text displaced from another visual column.
Software Engineer
Example Company
2021 - Present
- Built production services.

Experience
Uncertain continuation text.
Senior Developer
Another Company
2023 - Present
- Led delivery.`,
      },
    ],
  });
  assert.equal(result.draft.experience.length, 2);
  assert.equal(result.draft.education.length, 0);
  assert.equal(result.draft.unclassified.length, 2);
  assert.ok(
    result.draft.unclassified.every(
      (item) =>
        item.startParagraph <= item.endParagraph && item.sourcePage === 1,
    ),
  );
});

test("does not classify a technology list as education", () => {
  const result = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Developer Example
Software Engineer

Education
React, Next.js, TypeScript, Prisma, PostgreSQL
2020 - 2024`,
      },
    ],
  });
  assert.equal(result.draft.education.length, 0);
  assert.equal(result.draft.unclassified.length, 1);
});

test("keeps ambiguous organizations and heading-free content unclassified", () => {
  const ambiguous = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Jordan Example
Consultant

Experience
Example University
2019 - 2021
Community programme coordination.

Education
Example Foundation
2017 - 2018
Professional development programme.`,
      },
    ],
  });
  assert.equal(ambiguous.draft.experience.length, 0);
  assert.equal(ambiguous.draft.education.length, 0);
  assert.equal(ambiguous.draft.unclassified.length, 2);

  const missingHeadings = parseCvDocument({
    pages: [
      {
        pageNumber: 1,
        text: `Morgan Example
Software Engineer
Example Company
2022 - Present
Built production applications.`,
      },
    ],
  });
  assert.equal(missingHeadings.draft.experience.length, 0);
  assert.equal(missingHeadings.draft.education.length, 0);
  assert.equal(missingHeadings.draft.unclassified.length, 1);
});

test("detects common heading variants case-insensitively with exact ranges", () => {
  const sections = detectCvSections([
    {
      pageNumber: 1,
      text: `Person
PROFESSIONAL EXPERIENCE:
Engineer
Company
2020 - Present
QUALIFICATIONS
University
BSc Engineering
2016 - 2020
SELECTED PROJECTS
Project`,
    },
  ]);
  assert.deepEqual(
    sections.slice(1).map((section) => section.key),
    ["experience", "education", "projects"],
  );
  assert.ok(sections[1].endParagraph < sections[2].startParagraph);
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

test("maps accepted CV records to every public portfolio section without duplicates", () => {
  const grouped = groupPublishableCvRecordIds([
    { itemType: "PROFILE", createdRecordId: "profile-1" },
    { itemType: "EXPERIENCE", createdRecordId: "experience-1" },
    { itemType: "EXPERIENCE", createdRecordId: "experience-1" },
    { itemType: "EDUCATION", createdRecordId: "education-1" },
    { itemType: "SKILL", createdRecordId: "skill-1" },
    { itemType: "PROJECT", createdRecordId: "project-1" },
    { itemType: "CONTACT", createdRecordId: null },
  ]);
  assert.deepEqual(grouped, {
    PROFILE: ["profile-1"],
    EXPERIENCE: ["experience-1"],
    EDUCATION: ["education-1"],
    SKILL: ["skill-1"],
    PROJECT: ["project-1"],
  });
});

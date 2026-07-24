import { config } from "dotenv";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CV parser diagnostics are disabled in production.");
  }
  const [
    { db },
    { extractCvText },
    { parseCvDocument },
    { stageCvImport },
    { stageCvTechnologySuggestions },
  ] =
    await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/cv/extract"),
    import("../src/lib/cv/parser"),
    import("../src/lib/cv/stage"),
    import("../src/lib/cv/technologies"),
  ]);
  const upload = await db.cvUpload.findFirst({
    where: { mimeType: "application/pdf" },
    orderBy: { createdAt: "desc" },
    include: {
      mediaAsset: {
        select: { fileData: true, sizeBytes: true },
      },
      importRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          parserVersion: true,
          status: true,
          appliedAt: true,
          items: {
            select: {
              itemType: true,
              appliedAt: true,
              createdRecordId: true,
            },
          },
        },
      },
    },
  });
  if (!upload?.mediaAsset.fileData) {
    throw new Error("No private PDF upload found.");
  }
  const bytes = Buffer.from(upload.mediaAsset.fileData);
  const extraction = await extractCvText(bytes, upload.mimeType);
  const parsed = parseCvDocument({
    pages: extraction.pages,
    truncated: extraction.truncated,
    extractionWarnings: extraction.warnings,
  });
  const evidence = extraction.pages.flatMap((page) =>
    page.text.split(/\r?\n/).flatMap((line, index) => {
      const normalized = line.trim();
      const flags = {
        institution:
          /\b(university|college|school|academy|institute|polytechnic|faculty|conservatory)\b/i.test(
            normalized,
          ),
        degree:
          /\b(bachelor|master|doctor|phd|bsc|msc|mba|degree|diploma|qualification|certificate|major|minor|computer science|engineering)\b/i.test(
            normalized,
          ),
        role: /\b(engineer|developer|architect|manager|director|lead|consultant|designer|analyst|specialist|administrator|founder|officer|intern|freelancer|contractor|programmer|researcher|technician|coordinator|associate|head|owner|executive|assistant|representative|trainer|coach|teacher|accountant|recruiter|support|product|project|marketing|sales|operations|quality|scrum)\b/i.test(
          normalized,
        ),
        date: /(?:19|20)\d{2}/.test(normalized),
        headingWord:
          /\b(summary|experience|education|skills|projects|certifications|courses|languages)\b/i.test(
            normalized,
          ),
      };
      return Object.values(flags).some(Boolean)
        ? [
            {
              page: page.pageNumber,
              line: index + 1,
              characters: normalized.length,
              ...flags,
            },
          ]
        : [];
    }),
  );
  const before = upload.importRuns[0]?.items.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.itemType] = (counts[item.itemType] ?? 0) + 1;
      return counts;
    },
    {},
  );
  console.log(
    JSON.stringify(
      {
        uploadId: upload.id,
        storedBytes: upload.mediaAsset.sizeBytes,
        bufferBytes: bytes.length,
        pageCount: extraction.pageCount,
        pageCharacters: extraction.pages.map((page) => page.text.length),
        extractedCharacters: parsed.diagnostics.extractedCharacterCount,
        truncated: parsed.diagnostics.truncated,
        headings: parsed.diagnostics.detectedHeadings,
        sectionRanges: parsed.diagnostics.sectionRanges.map((range) => ({
          section: range.section,
          page: range.page,
          start: range.startParagraph,
          end: range.endParagraph,
          characters: range.characterCount,
        })),
        before: before ?? {},
        activeReview: upload.importRuns[0]
          ? {
              parserVersion: upload.importRuns[0].parserVersion,
              status: upload.importRuns[0].status,
              applied: Boolean(upload.importRuns[0].appliedAt),
              appliedItems: upload.importRuns[0].items.filter(
                (item) => item.appliedAt,
              ).length,
              createdCanonicalRecordIds: upload.importRuns[0].items.filter(
                (item) => item.createdRecordId,
              ).length,
            }
          : null,
        after: parsed.diagnostics.parsedItemCounts,
        unclassified: parsed.diagnostics.unclassifiedCount,
        metadata: parsed.itemMetadata.map((item) => ({
          type: item.itemType,
          page: item.sourcePage,
          section: item.sourceSection,
          start: item.startParagraph,
          end: item.endParagraph,
          confidence: item.confidence,
          warnings: item.warnings.length,
        })),
        evidence,
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--stage")) {
    if (upload.importRuns[0]?.parserVersion === "deterministic-3") {
      console.log("Latest review draft already uses deterministic-3; skipped.");
    } else {
      await db.cvUpload.update({
        where: { id: upload.id },
        data: {
          status: "READY_FOR_REVIEW",
          extractedText: extraction.text,
          extractionMetadata: {
            pageCount: extraction.pageCount,
            extractedPageCount: extraction.pages.length,
            extractedCharacterCount: parsed.diagnostics.extractedCharacterCount,
            lineCounts: extraction.pages.map(
              (page) => page.text.split(/\r?\n/).length,
            ),
            truncated: extraction.truncated,
          },
          extractionWarnings: extraction.warnings,
          pageCount: extraction.pageCount,
          scannedLikely: extraction.scannedLikely,
          extractedAt: new Date(),
          extractionError: null,
        },
      });
      const run = await stageCvImport({
        userId: upload.userId,
        cvUploadId: upload.id,
        draft: parsed.draft,
        itemMetadata: parsed.itemMetadata,
        diagnostics: parsed.diagnostics,
      });
      console.log(
        JSON.stringify({
          stagedReviewRunId: run.id,
          parserVersion: "deterministic-3",
          stagedItems: run.items.length,
          canonicalRecordsChanged: false,
        }),
      );
    }
  }
  if (process.argv.includes("--technologies")) {
    const detected = await stageCvTechnologySuggestions({
      userId: upload.userId,
      cvUploadId: upload.id,
      sourceName: upload.originalName,
      text: extraction.pages.map((page) => page.text).join("\n"),
    });
    console.log(
      JSON.stringify({
        stagedTechnologySuggestions: detected.length,
        canonicalSkillsChanged: false,
      }),
    );
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

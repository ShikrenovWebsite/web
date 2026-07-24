import { CvImportManager } from "@/components/admin/cv-import-manager";
import { SectionHeading } from "@/components/admin/section-heading";
import { requireAdminPage } from "@/lib/auth";
import { formatAdminDateTime } from "@/lib/date";
import { db } from "@/lib/db";
import { splitCvPages } from "@/lib/cv/pages";
import { suggestionBelongsToCvUpload } from "@/lib/cv/technologies";

export const metadata = { title: "CV import" };
export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function auditCounts(value: unknown) {
  const audit = Array.isArray(value) ? value : [];
  const actions = audit.flatMap((item) =>
    typeof item === "object" &&
    item &&
    "action" in item &&
    typeof item.action === "string"
      ? [item.action]
      : [],
  );
  return {
    imported: actions.filter((action) =>
      ["created", "replaced", "merged", "already_applied"].includes(action),
    ).length,
    skipped: actions.filter((action) =>
      ["skipped", "kept_existing"].includes(action),
    ).length,
    merged: actions.filter((action) => action === "merged").length,
  };
}

export default async function CvImportPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const requestedRunId = (await searchParams).run;
  const [history, suggestions] = await Promise.all([
    db.cvUpload.findMany({
      where: { userId: admin.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        importRuns: {
          orderBy: { createdAt: "desc" },
          include: { items: { orderBy: { displayOrder: "asc" } } },
        },
      },
    }),
    db.skillSuggestion.findMany({
      where: { userId: admin.id },
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
    }),
  ]);
  const allRuns = history.flatMap((upload) => upload.importRuns);
  const reviewRun =
    allRuns.find((run) => run.id === requestedRunId) ??
    allRuns.find((run) => run.status === "READY_FOR_REVIEW") ??
    allRuns[0] ??
    null;
  const reviewUpload = reviewRun
    ? history.find((upload) =>
        upload.importRuns.some((run) => run.id === reviewRun.id),
      )
    : null;
  const validationResult =
    reviewRun?.validationResult &&
    typeof reviewRun.validationResult === "object" &&
    !Array.isArray(reviewRun.validationResult)
      ? (reviewRun.validationResult as Record<string, unknown>)
      : null;
  const diagnostics =
    validationResult?.diagnostics &&
    typeof validationResult.diagnostics === "object" &&
    !Array.isArray(validationResult.diagnostics)
      ? (validationResult.diagnostics as Record<string, unknown>)
      : null;
  const structuredData =
    reviewRun?.structuredData &&
    typeof reviewRun.structuredData === "object" &&
    !Array.isArray(reviewRun.structuredData)
      ? (reviewRun.structuredData as Record<string, unknown>)
      : null;
  const technologySuggestions = reviewUpload
    ? suggestions.filter((suggestion) =>
        suggestionBelongsToCvUpload(suggestion.evidence, reviewUpload.id),
      )
    : [];

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Private PDF/DOCX extraction, structured review, technology suggestions, conflict resolution, and selective canonical import."
        title="CV"
      />
      <CvImportManager
        key={reviewRun?.id ?? "no-review"}
        history={history.map((upload) => {
          const latest = upload.importRuns[0] ?? null;
          const counts = upload.importRuns
            .map((run) => auditCounts(run.importAudit))
            .reduce(
              (total, item) => ({
                imported: total.imported + item.imported,
                skipped: total.skipped + item.skipped,
                merged: total.merged + item.merged,
              }),
              { imported: 0, skipped: 0, merged: 0 },
            );
          return {
            id: upload.id,
            importRunId: latest?.id ?? null,
            originalName: upload.originalName,
            sizeLabel: formatBytes(upload.sizeBytes),
            status: upload.status,
            parserVersion: latest?.parserVersion ?? "Not parsed",
            createdAtLabel: formatAdminDateTime(upload.createdAt),
            error: upload.extractionError,
            scannedLikely: upload.scannedLikely,
            itemCount: latest?.items.length ?? 0,
            importedCount: counts.imported,
            skippedCount: counts.skipped,
            mergedCount: counts.merged,
          };
        })}
        importRunId={reviewRun?.id ?? null}
        importRunStatus={reviewRun?.status ?? null}
        debug={
          reviewUpload?.extractedText
            ? {
                pages: splitCvPages(reviewUpload.extractedText),
                diagnostics,
                unclassified: Array.isArray(structuredData?.unclassified)
                  ? structuredData.unclassified
                  : [],
              }
            : null
        }
        reviewItems={
          reviewRun?.items.map((item) => ({
            id: item.id,
            itemType: item.itemType,
            status: item.status,
            resolution: item.resolution,
            importedJson: JSON.stringify(
              item.editedData ?? item.importedData,
              null,
              2,
            ),
            existingJson: item.existingData
              ? JSON.stringify(item.existingData, null, 2)
              : null,
            existingRecordId: item.existingRecordId,
            duplicateScore: item.duplicateScore,
            classificationConfidence: item.classificationConfidence,
            sourcePage: item.sourcePage,
            sourceSection: item.sourceSection,
            sourceStartParagraph: item.sourceStartParagraph,
            sourceEndParagraph: item.sourceEndParagraph,
            sourceText: item.sourceText,
            classificationWarnings: item.classificationWarnings,
          })) ?? []
        }
        technologySuggestions={technologySuggestions.map((suggestion) => ({
          id: suggestion.id,
          displayName: suggestion.displayName,
          category: suggestion.category,
          status: suggestion.status,
        }))}
      />
    </div>
  );
}

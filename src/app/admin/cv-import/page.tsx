import { CvImportManager } from "@/components/admin/cv-import-manager";
import { SectionHeading } from "@/components/admin/section-heading";
import { requireAdminPage } from "@/lib/auth";
import { formatAdminDateTime } from "@/lib/date";
import { db } from "@/lib/db";

export const metadata = { title: "CV import" };
export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default async function CvImportPage() {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const history = await db.cvUpload.findMany({
    where: { userId: admin.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      importRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { items: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  const reviewRun = history
    .flatMap((upload) => upload.importRuns)
    .find((run) => run.status === "READY_FOR_REVIEW");

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Private PDF/DOCX extraction, structured review, conflict resolution, and selective canonical import."
        title="CV"
      />
      <CvImportManager
        history={history.map((upload) => ({
          id: upload.id,
          originalName: upload.originalName,
          sizeLabel: formatBytes(upload.sizeBytes),
          status: upload.status,
          createdAtLabel: formatAdminDateTime(upload.createdAt),
          error: upload.extractionError,
          scannedLikely: upload.scannedLikely,
          itemCount: upload.importRuns[0]?.items.length ?? 0,
        }))}
        importRunId={reviewRun?.id ?? null}
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
          })) ?? []
        }
      />
    </div>
  );
}

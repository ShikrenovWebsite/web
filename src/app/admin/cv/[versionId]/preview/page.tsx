import { Download } from "lucide-react";
import { notFound } from "next/navigation";
import { CvPreview } from "@/components/admin/cv-preview";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth";
import { getCvDocumentData } from "@/lib/cv/document";

export const metadata = { title: "CV preview" };
export const dynamic = "force-dynamic";

export default async function CvPreviewPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const { admin } = await requireAdminPage(
    `/admin/cv/${versionId}/preview`,
  );
  const data = await getCvDocumentData(admin.id, versionId);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold">{data.version.name}</h1>
          <p className="text-sm text-muted-foreground">
            A4 ATS-friendly preview using saved selections and overrides.
          </p>
        </div>
        <Button asChild>
          <a href={`/api/admin/cv/${versionId}/pdf`}>
            <Download aria-hidden="true" className="size-4" />
            Download PDF
          </a>
        </Button>
      </div>
      <CvPreview data={data} />
    </div>
  );
}

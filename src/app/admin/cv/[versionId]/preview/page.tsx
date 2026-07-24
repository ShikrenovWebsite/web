import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { refreshCvVersionFromPortfolio } from "@/app/admin/cv/actions";
import { CvPreview } from "@/components/admin/cv-preview";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth";
import { getCvDocumentData } from "@/lib/cv/document";
import { databaseCuidSchema } from "@/lib/cv/version-input";

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
  if (!databaseCuidSchema.safeParse(versionId).success) notFound();
  const data = await getCvDocumentData(admin.id, versionId);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild className="mb-2 -ml-3" size="sm" variant="ghost">
            <Link href="/admin/cv">
              <ArrowLeft aria-hidden="true" className="size-4" />
              CV versions
            </Link>
          </Button>
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
      {data.version.newerDataAvailable ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              Newer portfolio data is available for this CV.
            </p>
            <p className="mt-1 text-xs">
              Refreshing preserves the CV-specific headline, summary, selected
              records, ordering, and bullet overrides.
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await refreshCvVersionFromPortfolio({ id: versionId });
            }}
          >
            <Button size="sm" type="submit" variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" />
              Refresh from portfolio
            </Button>
          </form>
        </div>
      ) : null}
      <CvPreview data={data} />
    </div>
  );
}

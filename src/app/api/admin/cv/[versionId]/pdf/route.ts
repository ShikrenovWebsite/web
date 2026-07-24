import { createHash } from "node:crypto";
import { requireAdminApi } from "@/lib/auth";
import { getCvDocumentData } from "@/lib/cv/document";
import { cvFilename, generateCvPdf } from "@/lib/cv/pdf";
import { databaseCuidSchema } from "@/lib/cv/version-input";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ versionId: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.authorized) return authorization.response;
  const { versionId } = await context.params;
  if (!databaseCuidSchema.safeParse(versionId).success) {
    return Response.json({ error: "Invalid CV version ID." }, { status: 400 });
  }
  const data = await getCvDocumentData(
    authorization.session.admin.id,
    versionId,
  );
  if (!data) {
    return Response.json({ error: "CV version not found." }, { status: 404 });
  }
  const generated = await generateCvPdf(data);
  const filename = cvFilename(data.profile.fullName, data.version.name);
  const checksum = createHash("sha256")
    .update(generated.bytes)
    .digest("hex");
  await db.$transaction([
    db.cvExportSnapshot.create({
      data: {
        userId: authorization.session.admin.id,
        cvVersionId: versionId,
        dataSnapshot: data,
        canonicalUpdatedAt: new Date(data.canonicalUpdatedAt),
        filename,
        checksum,
        sizeBytes: generated.bytes.length,
        pageCount: generated.pageCount,
        pdfData: generated.bytes,
      },
    }),
    db.cvVersion.update({
      where: { id: versionId },
      data: {
        lastExportedAt: new Date(),
        sourceUpdatedAt: new Date(data.canonicalUpdatedAt),
      },
    }),
  ]);
  return new Response(new Uint8Array(generated.bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(generated.bytes.length),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

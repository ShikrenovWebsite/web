import { requireAdminApi } from "@/lib/auth";
import { buildCvPdfFilename } from "@/lib/cv/filename";
import { db } from "@/lib/db";
import { databaseCuidSchema } from "@/lib/cv/version-input";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ snapshotId: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.authorized) return authorization.response;
  const { snapshotId } = await context.params;
  if (!databaseCuidSchema.safeParse(snapshotId).success) {
    return Response.json({ error: "Invalid CV export ID." }, { status: 400 });
  }
  const snapshot = await db.cvExportSnapshot.findFirst({
    where: {
      id: snapshotId,
      userId: authorization.session.admin.id,
    },
    select: {
      mimeType: true,
      pdfData: true,
      sizeBytes: true,
      cvVersion: { select: { name: true } },
      user: { select: { profile: { select: { fullName: true } } } },
    },
  });
  if (!snapshot) {
    return Response.json({ error: "CV export not found." }, { status: 404 });
  }
  const filename = buildCvPdfFilename(
    snapshot.cvVersion.name,
    snapshot.user.profile?.fullName,
  );
  return new Response(new Uint8Array(snapshot.pdfData), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(snapshot.sizeBytes),
      "Content-Type": snapshot.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

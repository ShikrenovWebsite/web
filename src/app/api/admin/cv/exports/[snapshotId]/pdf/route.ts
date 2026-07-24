import { requireAdminApi } from "@/lib/auth";
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
      filename: true,
      mimeType: true,
      pdfData: true,
      sizeBytes: true,
    },
  });
  if (!snapshot) {
    return Response.json({ error: "CV export not found." }, { status: 404 });
  }
  return new Response(new Uint8Array(snapshot.pdfData), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${snapshot.filename}"`,
      "Content-Length": String(snapshot.sizeBytes),
      "Content-Type": snapshot.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

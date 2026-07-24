import { createHash, randomUUID } from "node:crypto";
import { requireAdminApi } from "@/lib/auth";
import { extractCvText, CvExtractionError } from "@/lib/cv/extract";
import { parseCvText } from "@/lib/cv/parser";
import { stageCvImport } from "@/lib/cv/stage";
import {
  validateCvFile,
  CvUploadValidationError,
} from "@/lib/cv/upload";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

function safeError(error: unknown) {
  if (error instanceof CvUploadValidationError) return error.message;
  if (error instanceof CvExtractionError) return error.message;
  return "The CV could not be processed. The private upload was retained for review.";
}

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.authorized) return authorization.response;
  const expectedOrigin = new URL(getServerEnv().NEXTAUTH_URL).origin;
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== expectedOrigin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const recentUploads = await db.cvUpload.count({
    where: {
      userId: authorization.session.admin.id,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recentUploads >= 5) {
    return Response.json(
      { error: "Upload limit reached. Try again in a few minutes." },
      { status: 429 },
    );
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const value = formData.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return Response.json({ error: "Invalid multipart upload." }, { status: 400 });
  }
  if (!file) {
    return Response.json({ error: "Choose a CV file." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  let validated: Awaited<ReturnType<typeof validateCvFile>>;
  try {
    validated = await validateCvFile({
      name: file.name,
      declaredMime: file.type,
      data,
    });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 400 });
  }

  const checksum = createHash("sha256").update(data).digest("hex");
  const userId = authorization.session.admin.id;
  const upload = await db.$transaction(async (transaction) => {
    const media = await transaction.mediaAsset.create({
      data: {
        userId,
        kind: "CV",
        storageKey: `private/cv/${userId}/${randomUUID()}.${validated.extension}`,
        storageProvider: "DATABASE",
        fileData: data,
        originalName: file.name,
        mimeType: validated.mimeType,
        sizeBytes: data.length,
        checksum,
        isPrivate: true,
      },
    });
    return transaction.cvUpload.create({
      data: {
        userId,
        mediaAssetId: media.id,
        originalName: file.name,
        mimeType: validated.mimeType,
        sizeBytes: data.length,
        checksum,
        status: "EXTRACTING",
      },
    });
  });

  try {
    const extraction = await extractCvText(data, validated.mimeType);
    await db.cvUpload.update({
      where: { id: upload.id },
      data: {
        status: "PARSING",
        extractedText: extraction.text,
        extractionWarnings: extraction.warnings,
        pageCount: extraction.pageCount,
        scannedLikely: extraction.scannedLikely,
        extractedAt: new Date(),
      },
    });
    const draft = parseCvText(extraction.text);
    const importRun = await stageCvImport({
      userId,
      cvUploadId: upload.id,
      draft,
    });
    await db.cvUpload.update({
      where: { id: upload.id },
      data: { status: "READY_FOR_REVIEW" },
    });
    return Response.json({
      success: true,
      uploadId: upload.id,
      importRunId: importRun.id,
      message: "CV extracted and staged for review.",
    });
  } catch (error) {
    await db.cvUpload.update({
      where: { id: upload.id },
      data: {
        status: "FAILED",
        extractionError:
          error instanceof Error ? error.message.slice(0, 2000) : "Unknown error",
        scannedLikely:
          error instanceof CvExtractionError &&
          error.code === "INSUFFICIENT_TEXT",
      },
    });
    return Response.json({ error: safeError(error), uploadId: upload.id }, { status: 422 });
  }
}

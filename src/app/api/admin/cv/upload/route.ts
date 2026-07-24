import { createHash, randomUUID } from "node:crypto";
import { requireAdminApi } from "@/lib/auth";
import {
  extractCvText,
  CvExtractionError,
  extractionErrorDiagnostic,
} from "@/lib/cv/extract";
import { parseCvDocument } from "@/lib/cv/parser";
import { stageCvImport } from "@/lib/cv/stage";
import { stageCvTechnologySuggestions } from "@/lib/cv/technologies";
import {
  validateCvFile,
  CvUploadValidationError,
} from "@/lib/cv/upload";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

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

  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  const pdfSignature = data.subarray(0, 5).toString("ascii") === "%PDF-";
  if (process.env.NODE_ENV === "development") {
    console.info("[cv-upload] received", {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      bufferLength: data.length,
      pdfSignature,
      runtime: process.release.name,
      nextRuntime: process.env.NEXT_RUNTIME ?? "nodejs",
    });
  }
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
    const stored = await db.cvUpload.findFirst({
      where: { id: upload.id, userId },
      include: {
        mediaAsset: {
          select: { fileData: true, checksum: true, sizeBytes: true },
        },
      },
    });
    const storedData = Buffer.from(stored?.mediaAsset.fileData ?? []);
    const storedChecksum = createHash("sha256").update(storedData).digest("hex");
    const storageVerified =
      storedData.length === data.length &&
      stored?.mediaAsset.sizeBytes === data.length &&
      storedChecksum === checksum &&
      stored?.mediaAsset.checksum === checksum &&
      storedData.equals(data);
    if (process.env.NODE_ENV === "development") {
      console.info("[cv-upload] private storage verification", {
        uploadId: upload.id,
        originalBufferLength: data.length,
        storedBufferLength: storedData.length,
        checksumMatches: storedChecksum === checksum,
        byteIdentical: storedData.equals(data),
      });
    }
    if (!storageVerified) {
      throw new CvExtractionError(
        "The private upload could not be verified after storage. Upload the file again.",
        "EXTRACTOR_FAILURE",
        { cause: new Error("Stored CV bytes did not match the uploaded bytes.") },
      );
    }
    const extraction = await extractCvText(storedData, validated.mimeType);
    const parsedDocument = parseCvDocument({
      pages: extraction.pages,
      truncated: extraction.truncated,
      extractionWarnings: extraction.warnings,
    });
    if (process.env.NODE_ENV === "development") {
      console.info("[cv-upload] parse diagnostics", parsedDocument.diagnostics);
    }
    await db.cvUpload.update({
      where: { id: upload.id },
      data: {
        status: "PARSING",
        extractedText: extraction.text,
        extractionWarnings: extraction.warnings,
        extractionMetadata: {
          pageCount: extraction.pageCount,
          truncated: extraction.truncated,
          pages: extraction.pages.map((page) => ({
            pageNumber: page.pageNumber,
            characterCount: page.text.length,
            lineCount: page.text.split(/\r?\n/).length,
          })),
        },
        pageCount: extraction.pageCount,
        scannedLikely: extraction.scannedLikely,
        extractedAt: new Date(),
      },
    });
    const importRun = await stageCvImport({
      userId,
      cvUploadId: upload.id,
      draft: parsedDocument.draft,
      itemMetadata: parsedDocument.itemMetadata,
      diagnostics: parsedDocument.diagnostics,
    });
    await stageCvTechnologySuggestions({
      userId,
      cvUploadId: upload.id,
      sourceName: file.name,
      text: extraction.pages.map((page) => page.text).join("\n"),
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
    const diagnostic = extractionErrorDiagnostic(error);
    if (process.env.NODE_ENV === "development") {
      console.error("[cv-upload] processing failed", {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        bufferLength: data.length,
        pdfSignature,
        runtime: process.release.name,
        nextRuntime: process.env.NEXT_RUNTIME ?? "nodejs",
        ...diagnostic,
      });
    }
    await db.cvUpload.update({
      where: { id: upload.id },
      data: {
        status: "FAILED",
        extractionError: safeError(error),
        extractionMetadata: {
          failure: diagnostic,
        },
        scannedLikely:
          error instanceof CvExtractionError &&
          error.code === "SCANNED_PDF",
      },
    });
    return Response.json({ error: safeError(error), uploadId: upload.id }, { status: 422 });
  }
}

import mammoth from "mammoth";
import {
  AbortException,
  FormatError,
  InvalidPDFException,
  PasswordException,
  PDFParse,
  ResponseException,
  UnknownErrorException,
} from "pdf-parse";
import { joinCvPages } from "@/lib/cv/pages";
import type { CvSourcePage } from "@/lib/cv/parser";

export type CvExtractionErrorCode =
  | "INVALID_PDF"
  | "ENCRYPTED_PDF"
  | "SCANNED_PDF"
  | "EXTRACTOR_FAILURE"
  | "CORRUPTED_PDF"
  | "CORRUPTED_DOCX"
  | "INSUFFICIENT_TEXT"
  | "UNSUPPORTED_FILE";

export class CvExtractionError extends Error {
  constructor(
    message: string,
    readonly code: CvExtractionErrorCode,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "CvExtractionError";
  }
}

export function classifyPdfExtractionError(error: unknown): CvExtractionError {
  if (error instanceof CvExtractionError) return error;
  if (error instanceof PasswordException || errorName(error) === "PasswordException") {
    return new CvExtractionError(
      "This PDF is encrypted or password-protected. Export an unencrypted copy and upload it again.",
      "ENCRYPTED_PDF",
      { cause: error },
    );
  }
  if (
    error instanceof InvalidPDFException ||
    errorName(error) === "InvalidPDFException"
  ) {
    return new CvExtractionError(
      "The uploaded file is not a valid PDF document.",
      "INVALID_PDF",
      { cause: error },
    );
  }
  if (error instanceof FormatError || errorName(error) === "FormatError") {
    return new CvExtractionError(
      "The PDF has damaged or incomplete internal structure and cannot be read.",
      "CORRUPTED_PDF",
      { cause: error },
    );
  }
  if (
    error instanceof AbortException ||
    error instanceof ResponseException ||
    error instanceof UnknownErrorException ||
    ["AbortException", "ResponseException", "UnknownErrorException"].includes(
      errorName(error),
    )
  ) {
    return new CvExtractionError(
      "The PDF extractor could not process this file. Try the upload again or use DOCX.",
      "EXTRACTOR_FAILURE",
      { cause: error },
    );
  }
  return new CvExtractionError(
    "The PDF extractor failed unexpectedly. Try the upload again or use DOCX.",
    "EXTRACTOR_FAILURE",
    { cause: error },
  );
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "";
}

export function extractionErrorDiagnostic(error: unknown) {
  const outer = error instanceof Error ? error : new Error(String(error));
  const cause =
    outer instanceof CvExtractionError && outer.cause instanceof Error
      ? outer.cause
      : null;
  return {
    code: outer instanceof CvExtractionError ? outer.code : "UNKNOWN",
    errorName: outer.name,
    errorMessage: outer.message,
    parserErrorName: cause?.name ?? null,
    parserErrorMessage: cause?.message ?? null,
  };
}

function cleanExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function htmlLinks(value: string) {
  return [...value.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi)]
    .flatMap((match) => {
      try {
        const url = new URL(match[1]);
        return ["http:", "https:"].includes(url.protocol)
          ? [`${match[2].replace(/<[^>]+>/g, "").trim()}: ${url.toString()}`]
          : [];
      } catch {
        return [];
      }
    });
}

export async function extractCvText(
  data: Buffer,
  mimeType: string,
): Promise<{
  text: string;
  pages: CvSourcePage[];
  pageCount: number | null;
  warnings: string[];
  scannedLikely: boolean;
  truncated: boolean;
}> {
  if (mimeType === "application/pdf") {
    if (data.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new CvExtractionError(
        "The uploaded file is not a valid PDF document.",
        "INVALID_PDF",
      );
    }
    if (!data.subarray(Math.max(0, data.length - 4096)).includes(Buffer.from("%%EOF"))) {
      throw new CvExtractionError(
        "The PDF is truncated or has damaged internal structure.",
        "CORRUPTED_PDF",
      );
    }
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: new Uint8Array(data) });
      const result = await parser.getText({
        lineEnforce: true,
        cellSeparator: "\t",
        pageJoiner: "",
        parseHyperlinks: true,
      });
      const pages = result.pages.map((page) => ({
        pageNumber: page.num,
        text: cleanExtractedText(page.text),
      }));
      const textContent = pages.map((page) => page.text).join("\n");
      const text = joinCvPages(pages);
      if (textContent.replace(/\s/g, "").length < 80) {
        throw new CvExtractionError(
          "This PDF contains too little selectable text and appears to be scanned. Upload a text-based PDF or DOCX.",
          "SCANNED_PDF",
        );
      }
      return {
        text,
        pages,
        pageCount: result.total,
        warnings:
          pages.length === result.total
            ? []
            : [`Extractor returned ${pages.length} of ${result.total} pages.`],
        scannedLikely: false,
        truncated: pages.length !== result.total,
      };
    } catch (error) {
      throw classifyPdfExtractionError(error);
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const [raw, html] = await Promise.all([
        mammoth.extractRawText({ buffer: data }),
        mammoth.convertToHtml(
          { buffer: data },
          {
            externalFileAccess: false,
            convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
          },
        ),
      ]);
      const links = htmlLinks(html.value);
      const text = cleanExtractedText(
        [raw.value, links.length ? `Links\n${links.join("\n")}` : ""]
          .filter(Boolean)
          .join("\n\n"),
      );
      if (text.replace(/\s/g, "").length < 40) {
        throw new CvExtractionError(
          "The DOCX contains too little readable text.",
          "INSUFFICIENT_TEXT",
        );
      }
      return {
        text: joinCvPages([{ pageNumber: 1, text }]),
        pages: [{ pageNumber: 1, text }],
        pageCount: null,
        warnings: [...raw.messages, ...html.messages].map(
          (message) => message.message,
        ),
        scannedLikely: false,
        truncated: false,
      };
    } catch (error) {
      if (error instanceof CvExtractionError) throw error;
      throw new CvExtractionError(
        "The DOCX is corrupted or cannot be read.",
        "CORRUPTED_DOCX",
        { cause: error },
      );
    }
  }

  throw new CvExtractionError("Unsupported CV file type.", "UNSUPPORTED_FILE");
}

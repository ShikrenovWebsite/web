import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export class CvExtractionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "CORRUPTED_FILE"
      | "INSUFFICIENT_TEXT"
      | "UNSUPPORTED_FILE",
  ) {
    super(message);
    this.name = "CvExtractionError";
  }
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
  pageCount: number | null;
  warnings: string[];
  scannedLikely: boolean;
}> {
  if (mimeType === "application/pdf") {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: new Uint8Array(data) });
      const result = await parser.getText();
      const text = cleanExtractedText(result.text);
      if (text.replace(/\s/g, "").length < 80) {
        throw new CvExtractionError(
          "This PDF contains too little selectable text and appears to be scanned. Upload a text-based PDF or DOCX.",
          "INSUFFICIENT_TEXT",
        );
      }
      return {
        text,
        pageCount: result.total,
        warnings: [],
        scannedLikely: false,
      };
    } catch (error) {
      if (error instanceof CvExtractionError) throw error;
      throw new CvExtractionError(
        "The PDF is corrupted, encrypted, or cannot be read.",
        "CORRUPTED_FILE",
      );
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
        text,
        pageCount: null,
        warnings: [...raw.messages, ...html.messages].map(
          (message) => message.message,
        ),
        scannedLikely: false,
      };
    } catch (error) {
      if (error instanceof CvExtractionError) throw error;
      throw new CvExtractionError(
        "The DOCX is corrupted or cannot be read.",
        "CORRUPTED_FILE",
      );
    }
  }

  throw new CvExtractionError("Unsupported CV file type.", "UNSUPPORTED_FILE");
}

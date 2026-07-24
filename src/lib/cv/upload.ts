import { fileTypeFromBuffer } from "file-type";

export const MAX_CV_FILE_SIZE = 8 * 1024 * 1024;
export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class CvUploadValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "EMPTY_FILE"
      | "FILE_TOO_LARGE"
      | "INVALID_EXTENSION"
      | "INVALID_MIME"
      | "SIGNATURE_MISMATCH",
  ) {
    super(message);
    this.name = "CvUploadValidationError";
  }
}

export async function validateCvFile(input: {
  name: string;
  declaredMime: string;
  data: Buffer;
}) {
  if (!input.data.length) {
    throw new CvUploadValidationError("The uploaded file is empty.", "EMPTY_FILE");
  }
  if (input.data.length > MAX_CV_FILE_SIZE) {
    throw new CvUploadValidationError(
      "The CV exceeds the 8 MB upload limit.",
      "FILE_TOO_LARGE",
    );
  }
  const extension = input.name.toLowerCase().split(".").at(-1);
  if (!extension || !["pdf", "docx"].includes(extension)) {
    throw new CvUploadValidationError(
      "Upload a PDF or DOCX file.",
      "INVALID_EXTENSION",
    );
  }
  const expectedMime = extension === "pdf" ? PDF_MIME : DOCX_MIME;
  if (input.declaredMime !== expectedMime) {
    throw new CvUploadValidationError(
      "The browser-reported file type does not match the extension.",
      "INVALID_MIME",
    );
  }
  const detected = await fileTypeFromBuffer(input.data);
  if (detected?.mime !== expectedMime) {
    throw new CvUploadValidationError(
      "The file signature does not match a valid PDF or DOCX.",
      "SIGNATURE_MISMATCH",
    );
  }
  return { mimeType: expectedMime, extension };
}

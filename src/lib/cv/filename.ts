/**
 * Builds the one public-facing CV PDF filename used by exports and downloads.
 * Snapshot IDs and export sequencing remain internal database concerns.
 */
export function buildCvPdfFilename(
  cvName: string | null | undefined,
  fallbackName: string | null | undefined,
) {
  const name = cleanFilenameSource(cvName) || cleanFilenameSource(fallbackName);
  if (!name) return "CV.pdf";

  const stem = toSafeFilenameStem(name)
    .replace(/(?:-cv)+$/i, "")
    .replace(/-+$/g, "");
  return stem ? `${stem}-CV.pdf` : "CV.pdf";
}

function cleanFilenameSource(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\.pdf$/i, "")
    // Older CV versions were given a database-uniqueness suffix such as
    // "(2)". It is not part of the user-facing document filename.
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
}

function toSafeFilenameStem(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

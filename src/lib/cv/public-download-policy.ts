export type PublicCvSnapshotCandidate = {
  exportedAt: Date;
  mimeType: string;
  sizeBytes: number;
};

export function selectLatestPublicCvSnapshot<T extends PublicCvSnapshotCandidate>(
  snapshots: readonly T[],
) {
  return snapshots
    .filter(
      (snapshot) =>
        snapshot.mimeType === "application/pdf" && snapshot.sizeBytes > 0,
    )
    .toSorted((left, right) => right.exportedAt.getTime() - left.exportedAt.getTime())[0] ?? null;
}

export function publicCvDownloadResponse(input: {
  bytes: Uint8Array;
  filename: string;
  sizeBytes: number;
}) {
  const bytes = Uint8Array.from(input.bytes);
  return new Response(bytes.buffer, {
    headers: {
      "Cache-Control": "public, no-cache",
      "Content-Disposition": `attachment; filename="${input.filename}"`,
      "Content-Length": String(input.sizeBytes),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

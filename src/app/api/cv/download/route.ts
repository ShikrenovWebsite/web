import { getPublicCvDownload } from "@/lib/cv/public-download";
import { publicCvDownloadResponse } from "@/lib/cv/public-download-policy";

export const runtime = "nodejs";

export async function GET() {
  const download = await getPublicCvDownload();
  if (!download) {
    return Response.json({ error: "CV currently unavailable." }, { status: 404 });
  }
  return publicCvDownloadResponse({
    bytes: new Uint8Array(download.bytes),
    filename: download.filename,
    sizeBytes: download.sizeBytes,
  });
}

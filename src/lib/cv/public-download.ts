import "server-only";

import { db } from "@/lib/db";
import { buildCvPdfFilename } from "./filename";

async function findPortfolioOwner() {
  return db.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, profile: { select: { fullName: true } } },
  });
}

export async function hasPublicCvDownload() {
  const owner = await findPortfolioOwner();
  if (!owner) return false;
  const snapshot = await db.cvExportSnapshot.findFirst({
    where: {
      userId: owner.id,
      mimeType: "application/pdf",
      sizeBytes: { gt: 0 },
    },
    orderBy: { exportedAt: "desc" },
    select: { id: true },
  });
  return Boolean(snapshot);
}

export async function getPublicCvDownload() {
  const owner = await findPortfolioOwner();
  if (!owner) return null;
  const snapshot = await db.cvExportSnapshot.findFirst({
    where: {
      userId: owner.id,
      mimeType: "application/pdf",
      sizeBytes: { gt: 0 },
    },
    orderBy: { exportedAt: "desc" },
    select: {
      pdfData: true,
      sizeBytes: true,
      cvVersion: { select: { name: true } },
    },
  });
  if (!snapshot) return null;
  return {
    bytes: snapshot.pdfData,
    filename: buildCvPdfFilename(
      snapshot.cvVersion.name,
      owner.profile?.fullName,
    ),
    sizeBytes: snapshot.sizeBytes,
  };
}

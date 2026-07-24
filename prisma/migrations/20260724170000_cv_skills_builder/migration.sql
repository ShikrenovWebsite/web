-- Additive CV workflow states. Existing enum values remain valid.
ALTER TYPE "CvUploadStatus" ADD VALUE IF NOT EXISTS 'EXTRACTING';
ALTER TYPE "CvUploadStatus" ADD VALUE IF NOT EXISTS 'EXTRACTED';
ALTER TYPE "CvUploadStatus" ADD VALUE IF NOT EXISTS 'PARSING';
ALTER TYPE "CvUploadStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_IMPORTED';
ALTER TYPE "ImportResolution" ADD VALUE IF NOT EXISTS 'CREATE_NEW';

CREATE TYPE "SkillSuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED');
CREATE TYPE "CvTemplate" AS ENUM ('ATS_SINGLE_COLUMN');

ALTER TABLE "Experience"
ADD COLUMN "employmentType" TEXT;

ALTER TABLE "Education"
ADD COLUMN "achievements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "PortfolioProject"
ADD COLUMN "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "CvUpload"
ADD COLUMN "extractionWarnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "pageCount" INTEGER,
ADD COLUMN "scannedLikely" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "extractedAt" TIMESTAMP(3);

ALTER TABLE "CvImportRun"
ADD COLUMN "validationResult" JSONB,
ADD COLUMN "importAudit" JSONB,
ADD COLUMN "appliedAt" TIMESTAMP(3);

ALTER TABLE "CvImportItem"
ADD COLUMN "appliedAt" TIMESTAMP(3);

ALTER TABLE "MediaAsset"
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'DATABASE',
ADD COLUMN "fileData" BYTEA;

CREATE TABLE "SkillSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "sourceTypes" TEXT[] NOT NULL,
    "evidence" JSONB NOT NULL,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SkillSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "skillId" TEXT,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CvVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customHeadline" TEXT,
    "customSummary" TEXT,
    "selectedExperienceIds" TEXT[] NOT NULL,
    "selectedProjectIds" TEXT[] NOT NULL,
    "selectedEducationIds" TEXT[] NOT NULL,
    "selectedSkillIds" TEXT[] NOT NULL,
    "selectedCertificationIds" TEXT[] NOT NULL,
    "selectedLanguageIds" TEXT[] NOT NULL,
    "sectionOrder" TEXT[] NOT NULL,
    "itemOrder" JSONB,
    "visibilitySettings" JSONB,
    "overrides" JSONB,
    "template" "CvTemplate" NOT NULL DEFAULT 'ATS_SINGLE_COLUMN',
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastExportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CvExportSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cvVersionId" TEXT NOT NULL,
    "dataSnapshot" JSONB NOT NULL,
    "canonicalUpdatedAt" TIMESTAMP(3) NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "checksum" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "pdfData" BYTEA NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvExportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillSuggestion_userId_normalizedKey_key"
ON "SkillSuggestion"("userId", "normalizedKey");
CREATE INDEX "SkillSuggestion_userId_status_confidence_idx"
ON "SkillSuggestion"("userId", "status", "confidence");
CREATE INDEX "SkillSuggestion_skillId_idx"
ON "SkillSuggestion"("skillId");

CREATE UNIQUE INDEX "CvVersion_userId_name_key"
ON "CvVersion"("userId", "name");
CREATE INDEX "CvVersion_userId_updatedAt_idx"
ON "CvVersion"("userId", "updatedAt");

CREATE INDEX "CvExportSnapshot_userId_exportedAt_idx"
ON "CvExportSnapshot"("userId", "exportedAt");
CREATE INDEX "CvExportSnapshot_cvVersionId_exportedAt_idx"
ON "CvExportSnapshot"("cvVersionId", "exportedAt");

ALTER TABLE "SkillSuggestion"
ADD CONSTRAINT "SkillSuggestion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SkillSuggestion"
ADD CONSTRAINT "SkillSuggestion_skillId_fkey"
FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CvVersion"
ADD CONSTRAINT "CvVersion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CvExportSnapshot"
ADD CONSTRAINT "CvExportSnapshot_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CvExportSnapshot"
ADD CONSTRAINT "CvExportSnapshot_cvVersionId_fkey"
FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

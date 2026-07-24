-- Additive source provenance for page-aware CV parsing and protected review diagnostics.
ALTER TABLE "CvUpload"
ADD COLUMN "extractionMetadata" JSONB;

ALTER TABLE "CvImportItem"
ADD COLUMN "classificationConfidence" DOUBLE PRECISION,
ADD COLUMN "sourcePage" INTEGER,
ADD COLUMN "sourceSection" TEXT,
ADD COLUMN "sourceStartParagraph" INTEGER,
ADD COLUMN "sourceEndParagraph" INTEGER,
ADD COLUMN "sourceText" TEXT,
ADD COLUMN "classificationWarnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

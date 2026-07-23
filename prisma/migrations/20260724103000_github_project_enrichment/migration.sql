ALTER TABLE "PortfolioProject"
ADD COLUMN "coverImageUrl" TEXT;

ALTER TABLE "GitHubRepository"
ADD COLUMN "readmeMarkdown" TEXT,
ADD COLUMN "readmeImages" JSONB,
ADD COLUMN "sourceFilesSnapshot" JSONB,
ADD COLUMN "enrichmentSnapshot" JSONB,
ADD COLUMN "enrichmentFingerprint" TEXT,
ADD COLUMN "enrichmentVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "enrichedAt" TIMESTAMP(3),
ADD COLUMN "enrichmentError" TEXT,
ADD COLUMN "detectedTechnologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "suggestedTitle" TEXT,
ADD COLUMN "suggestedShortDescription" TEXT,
ADD COLUMN "suggestedLongDescription" TEXT,
ADD COLUMN "suggestedCoverImageUrl" TEXT;

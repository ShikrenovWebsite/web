-- Track the one-time publication of accepted CV records and technology skills.
-- This prevents later manual hide/draft decisions from being re-promoted.
ALTER TABLE "CvImportItem"
ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "SkillSuggestion"
ADD COLUMN "publishedAt" TIMESTAMP(3);

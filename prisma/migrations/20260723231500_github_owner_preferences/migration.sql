CREATE TYPE "GitHubOwnerPreference" AS ENUM ('PENDING', 'ENABLED', 'IGNORED');

ALTER TABLE "GitHubOwner"
ADD COLUMN "preference" "GitHubOwnerPreference" NOT NULL DEFAULT 'PENDING';

UPDATE "GitHubOwner"
SET "preference" = CASE
  WHEN "type" = 'USER' THEN 'ENABLED'::"GitHubOwnerPreference"
  WHEN "syncEnabled" = TRUE THEN 'ENABLED'::"GitHubOwnerPreference"
  ELSE 'IGNORED'::"GitHubOwnerPreference"
END;

ALTER TABLE "GitHubOwner"
ALTER COLUMN "syncEnabled" SET DEFAULT FALSE;

DROP INDEX IF EXISTS "GitHubOwner_connectionId_type_syncEnabled_idx";
CREATE INDEX "GitHubOwner_connectionId_type_preference_idx"
ON "GitHubOwner"("connectionId", "type", "preference");

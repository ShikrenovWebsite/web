-- Phase 3 GitHub synchronization source metadata and run diagnostics.
ALTER TABLE "GitHubRepository"
ADD COLUMN "ownerLogin" TEXT NOT NULL DEFAULT '',
ADD COLUMN "defaultBranch" TEXT,
ADD COLUMN "githubPushedAt" TIMESTAMP(3),
ADD COLUMN "lastSuccessfulSyncAt" TIMESTAMP(3),
ADD COLUMN "unavailableReason" TEXT;

ALTER TABLE "GitHubRepository"
ALTER COLUMN "ownerLogin" DROP DEFAULT;

ALTER TABLE "GitHubSyncRun"
ADD COLUMN "unchangedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "warningCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rateLimitRemaining" INTEGER,
ADD COLUMN "rateLimitResetAt" TIMESTAMP(3);

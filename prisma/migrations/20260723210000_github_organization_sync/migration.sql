-- Add organization ownership and partial-sync diagnostics without changing
-- existing repository review decisions or portfolio projects.
CREATE TYPE "GitHubOwnerType" AS ENUM ('USER', 'ORGANIZATION');
CREATE TYPE "GitHubAccessStatus" AS ENUM (
  'ACCESSIBLE',
  'REAUTHORIZATION_REQUIRED',
  'APPROVAL_REQUIRED',
  'RESTRICTED',
  'PARTIAL',
  'UNAVAILABLE'
);

CREATE TABLE "GitHubOwner" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "githubOwnerId" TEXT NOT NULL,
  "login" TEXT NOT NULL,
  "type" "GitHubOwnerType" NOT NULL,
  "avatarUrl" TEXT,
  "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "accessStatus" "GitHubAccessStatus" NOT NULL DEFAULT 'ACCESSIBLE',
  "accessMessage" TEXT,
  "eligibleRepositoryCount" INTEGER NOT NULL DEFAULT 0,
  "lastDiscoveredAt" TIMESTAMP(3),
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GitHubOwner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GitHubOwner_connectionId_githubOwnerId_key"
ON "GitHubOwner"("connectionId", "githubOwnerId");

CREATE UNIQUE INDEX "GitHubOwner_connectionId_login_key"
ON "GitHubOwner"("connectionId", "login");

CREATE INDEX "GitHubOwner_connectionId_type_syncEnabled_idx"
ON "GitHubOwner"("connectionId", "type", "syncEnabled");

ALTER TABLE "GitHubOwner"
ADD CONSTRAINT "GitHubOwner_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "GitHubConnection"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GitHubRepository"
ADD COLUMN "ownerRecordId" TEXT,
ADD COLUMN "ownerType" "GitHubOwnerType" NOT NULL DEFAULT 'USER',
ADD COLUMN "ownerAvatarUrl" TEXT;

CREATE INDEX "GitHubRepository_ownerRecordId_status_idx"
ON "GitHubRepository"("ownerRecordId", "status");

ALTER TABLE "GitHubRepository"
ADD CONSTRAINT "GitHubRepository_ownerRecordId_fkey"
FOREIGN KEY ("ownerRecordId") REFERENCES "GitHubOwner"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GitHubSyncRun"
ADD COLUMN "personalRepositoriesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "organizationsDiscovered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "organizationRepositoriesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "organizationsSynchronized" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "organizationsSkipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "organizationsRequiringApproval" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "partialFailureCount" INTEGER NOT NULL DEFAULT 0;

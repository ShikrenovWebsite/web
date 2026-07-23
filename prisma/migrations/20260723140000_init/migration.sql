-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'CV_IMPORT', 'GITHUB');

-- CreateEnum
CREATE TYPE "GitHubRepositoryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'REMOVED');

-- CreateEnum
CREATE TYPE "GitHubSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "GitHubSyncChangeType" AS ENUM ('NEW', 'UPDATED', 'UNCHANGED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CvUploadStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY_FOR_REVIEW', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('PROCESSING', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('PENDING', 'ACCEPTED', 'SKIPPED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "ImportItemType" AS ENUM ('PROFILE', 'EXPERIENCE', 'EDUCATION', 'SKILL', 'CERTIFICATION', 'LANGUAGE', 'PROJECT', 'CONTACT');

-- CreateEnum
CREATE TYPE "ImportResolution" AS ENUM ('KEEP_EXISTING', 'REPLACE', 'MERGE', 'SKIP');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('CV', 'AVATAR', 'PROJECT_COVER', 'PROJECT_GALLERY', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "githubLogin" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PortfolioProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "professionalTitle" TEXT,
    "biography" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "websiteUrl" TEXT,
    "socialLinks" JSONB,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "highlights" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT,
    "fieldOfStudy" TEXT,
    "location" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "proficiency" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "credentialUrl" TEXT,
    "credentialId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proficiency" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubRepositoryId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "technologies" TEXT[],
    "liveUrl" TEXT,
    "sourceCodeUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubUserId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "tokenKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "scopes" TEXT[],
    "includeForks" BOOLEAN NOT NULL DEFAULT false,
    "includeArchived" BOOLEAN NOT NULL DEFAULT false,
    "includeTemplates" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubRepository" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "githubRepositoryId" TEXT NOT NULL,
    "nodeId" TEXT,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "githubUrl" TEXT NOT NULL,
    "homepageUrl" TEXT,
    "primaryLanguage" TEXT,
    "topics" TEXT[],
    "starCount" INTEGER NOT NULL DEFAULT 0,
    "forkCount" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isFork" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "readmePreview" TEXT,
    "githubCreatedAt" TIMESTAMP(3),
    "githubUpdatedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "unavailableAt" TIMESTAMP(3),
    "sourceSnapshot" JSONB NOT NULL,
    "status" "GitHubRepositoryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubRepository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubSyncRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "status" "GitHubSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "repositoriesSeen" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "changedCount" INTEGER NOT NULL DEFAULT 0,
    "unavailableCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubSyncItem" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "changeType" "GitHubSyncChangeType" NOT NULL,
    "previousData" JSONB,
    "incomingData" JSONB NOT NULL,
    "fieldsChanged" TEXT[],
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubSyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "CvUploadStatus" NOT NULL DEFAULT 'UPLOADED',
    "extractedText" TEXT,
    "extractionError" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvImportRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cvUploadId" TEXT NOT NULL,
    "status" "ImportRunStatus" NOT NULL DEFAULT 'PROCESSING',
    "parserVersion" TEXT NOT NULL,
    "structuredData" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvImportItem" (
    "id" TEXT NOT NULL,
    "importRunId" TEXT NOT NULL,
    "itemType" "ImportItemType" NOT NULL,
    "status" "ImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" "ImportResolution",
    "importedData" JSONB NOT NULL,
    "editedData" JSONB,
    "existingRecordId" TEXT,
    "existingData" JSONB,
    "duplicateScore" DOUBLE PRECISION,
    "createdRecordId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" "MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "altText" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteTitle" TEXT NOT NULL,
    "siteDescription" TEXT,
    "contactEmail" TEXT,
    "isContactFormEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isCvDownloadEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicCvUploadId" TEXT,
    "socialLinks" JSONB,
    "seoMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProfile_userId_key" ON "PortfolioProfile"("userId");

-- CreateIndex
CREATE INDEX "Experience_userId_status_displayOrder_idx" ON "Experience"("userId", "status", "displayOrder");

-- CreateIndex
CREATE INDEX "Education_userId_status_displayOrder_idx" ON "Education"("userId", "status", "displayOrder");

-- CreateIndex
CREATE INDEX "Skill_userId_status_displayOrder_idx" ON "Skill"("userId", "status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_userId_name_key" ON "Skill"("userId", "name");

-- CreateIndex
CREATE INDEX "Certification_userId_status_displayOrder_idx" ON "Certification"("userId", "status", "displayOrder");

-- CreateIndex
CREATE INDEX "Language_userId_status_displayOrder_idx" ON "Language"("userId", "status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Language_userId_name_key" ON "Language"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProject_githubRepositoryId_key" ON "PortfolioProject"("githubRepositoryId");

-- CreateIndex
CREATE INDEX "PortfolioProject_userId_status_displayOrder_idx" ON "PortfolioProject"("userId", "status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProject_userId_slug_key" ON "PortfolioProject"("userId", "slug");

-- CreateIndex
CREATE INDEX "GitHubConnection_userId_isActive_idx" ON "GitHubConnection"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubConnection_userId_githubUserId_key" ON "GitHubConnection"("userId", "githubUserId");

-- CreateIndex
CREATE INDEX "GitHubRepository_connectionId_status_idx" ON "GitHubRepository"("connectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepository_connectionId_githubRepositoryId_key" ON "GitHubRepository"("connectionId", "githubRepositoryId");

-- CreateIndex
CREATE INDEX "GitHubSyncRun_connectionId_startedAt_idx" ON "GitHubSyncRun"("connectionId", "startedAt");

-- CreateIndex
CREATE INDEX "GitHubSyncRun_userId_startedAt_idx" ON "GitHubSyncRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "GitHubSyncItem_repositoryId_idx" ON "GitHubSyncItem"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubSyncItem_syncRunId_repositoryId_key" ON "GitHubSyncItem"("syncRunId", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CvUpload_mediaAssetId_key" ON "CvUpload"("mediaAssetId");

-- CreateIndex
CREATE INDEX "CvUpload_userId_createdAt_idx" ON "CvUpload"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CvImportRun_userId_createdAt_idx" ON "CvImportRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CvImportRun_cvUploadId_idx" ON "CvImportRun"("cvUploadId");

-- CreateIndex
CREATE INDEX "CvImportItem_importRunId_status_displayOrder_idx" ON "CvImportItem"("importRunId", "status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_kind_idx" ON "MediaAsset"("userId", "kind");

-- CreateIndex
CREATE INDEX "MediaAsset_projectId_displayOrder_idx" ON "MediaAsset"("projectId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_userId_key" ON "SiteSettings"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProfile" ADD CONSTRAINT "PortfolioProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_githubRepositoryId_fkey" FOREIGN KEY ("githubRepositoryId") REFERENCES "GitHubRepository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepository" ADD CONSTRAINT "GitHubRepository_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GitHubConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncRun" ADD CONSTRAINT "GitHubSyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncRun" ADD CONSTRAINT "GitHubSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GitHubConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncItem" ADD CONSTRAINT "GitHubSyncItem_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "GitHubSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncItem" ADD CONSTRAINT "GitHubSyncItem_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitHubRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvUpload" ADD CONSTRAINT "CvUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvUpload" ADD CONSTRAINT "CvUpload_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvImportRun" ADD CONSTRAINT "CvImportRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvImportRun" ADD CONSTRAINT "CvImportRun_cvUploadId_fkey" FOREIGN KEY ("cvUploadId") REFERENCES "CvUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvImportItem" ADD CONSTRAINT "CvImportItem_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "CvImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

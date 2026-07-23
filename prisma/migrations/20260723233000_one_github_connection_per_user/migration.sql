DROP INDEX IF EXISTS "GitHubConnection_userId_githubUserId_key";

CREATE UNIQUE INDEX "GitHubConnection_userId_key"
ON "GitHubConnection"("userId");

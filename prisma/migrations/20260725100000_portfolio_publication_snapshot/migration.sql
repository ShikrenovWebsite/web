-- Additive public snapshot boundary. Canonical admin rows remain editable drafts.
CREATE TABLE "PortfolioPublication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortfolioPublication_userId_key"
ON "PortfolioPublication"("userId");

ALTER TABLE "PortfolioPublication"
ADD CONSTRAINT "PortfolioPublication_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

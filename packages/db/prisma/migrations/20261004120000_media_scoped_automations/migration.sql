-- Account-wide keyword rules cannot be attached to a post after the fact.
DELETE FROM "AutomationExecution";
DELETE FROM "Automation";

CREATE TYPE "AutomationActionType" AS ENUM ('private_reply');

CREATE TABLE "InstagramMedia" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "instagramMediaId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "permalink" TEXT,
    "thumbnailUrl" TEXT,
    "mediaUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationKeyword" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalizedKeyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationKeyword_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Automation" DROP COLUMN "keyword";
ALTER TABLE "Automation" ADD COLUMN "mediaId" TEXT NOT NULL;
ALTER TABLE "Automation" ADD COLUMN "actionType" "AutomationActionType" NOT NULL DEFAULT 'private_reply';
ALTER TABLE "Automation" ADD COLUMN "actionConfig" JSONB;

ALTER TABLE "AutomationExecution" ADD COLUMN "instagramMediaId" TEXT;

CREATE UNIQUE INDEX "InstagramMedia_instagramAccountId_instagramMediaId_key" ON "InstagramMedia"("instagramAccountId", "instagramMediaId");
CREATE INDEX "InstagramMedia_instagramAccountId_publishedAt_idx" ON "InstagramMedia"("instagramAccountId", "publishedAt");

CREATE UNIQUE INDEX "AutomationKeyword_automationId_normalizedKeyword_key" ON "AutomationKeyword"("automationId", "normalizedKeyword");
CREATE INDEX "AutomationKeyword_automationId_idx" ON "AutomationKeyword"("automationId");

DROP INDEX "Automation_userId_instagramAccountId_enabled_idx";
DROP INDEX "Automation_instagramAccountId_enabled_idx";
CREATE INDEX "Automation_userId_instagramAccountId_enabled_idx" ON "Automation"("userId", "instagramAccountId", "enabled");
CREATE INDEX "Automation_instagramAccountId_mediaId_enabled_idx" ON "Automation"("instagramAccountId", "mediaId", "enabled");
CREATE INDEX "Automation_mediaId_enabled_idx" ON "Automation"("mediaId", "enabled");

ALTER TABLE "InstagramMedia" ADD CONSTRAINT "InstagramMedia_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "InstagramMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationKeyword" ADD CONSTRAINT "AutomationKeyword_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstagramMedia" ADD COLUMN "timestamp" TIMESTAMP(3);
UPDATE "InstagramMedia" SET "timestamp" = "publishedAt" WHERE "timestamp" IS NULL AND "publishedAt" IS NOT NULL;

ALTER TABLE "WebhookEvent" ADD COLUMN "processingError" TEXT;

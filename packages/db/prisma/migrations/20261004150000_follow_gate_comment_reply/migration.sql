ALTER TABLE "Automation" ADD COLUMN "requireFollow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Automation" ADD COLUMN "commentReplyMessage" TEXT;
UPDATE "Automation" SET "commentReplyMessage" = '@username check your dm!' WHERE "commentReplyMessage" IS NULL;

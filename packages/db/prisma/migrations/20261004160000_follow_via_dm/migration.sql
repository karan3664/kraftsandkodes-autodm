ALTER TYPE "ExecutionStatus" ADD VALUE 'awaiting_follow';
ALTER TABLE "Automation" ADD COLUMN "followPromptMessage" TEXT;
ALTER TABLE "Automation" ADD COLUMN "notFollowingMessage" TEXT;
CREATE INDEX "AutomationExecution_instagramAccountId_commenterInstagramId_status_idx" ON "AutomationExecution"("instagramAccountId", "commenterInstagramId", "status");

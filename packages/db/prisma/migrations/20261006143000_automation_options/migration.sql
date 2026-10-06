ALTER TYPE "MatchType" ADD VALUE 'any';
ALTER TYPE "AutomationActionType" ADD VALUE 'comment_reply';

ALTER TABLE "Automation" ADD COLUMN "ignoreOwnComments" BOOLEAN NOT NULL DEFAULT true;

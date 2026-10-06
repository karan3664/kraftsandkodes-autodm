-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "memberUserId" TEXT,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'pending',
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberAccount" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMemberAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_inviteTokenHash_key" ON "TeamMember"("inviteTokenHash");

-- CreateIndex
CREATE INDEX "TeamMember_ownerUserId_status_idx" ON "TeamMember"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "TeamMember_memberUserId_idx" ON "TeamMember"("memberUserId");

-- CreateIndex
CREATE INDEX "TeamMember_email_idx" ON "TeamMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberAccount_teamMemberId_instagramAccountId_key" ON "TeamMemberAccount"("teamMemberId", "instagramAccountId");

-- CreateIndex
CREATE INDEX "TeamMemberAccount_instagramAccountId_idx" ON "TeamMemberAccount"("instagramAccountId");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberAccount" ADD CONSTRAINT "TeamMemberAccount_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberAccount" ADD CONSTRAINT "TeamMemberAccount_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

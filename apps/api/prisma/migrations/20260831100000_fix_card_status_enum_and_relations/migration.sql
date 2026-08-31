-- Align CardStatus with PRD §8: AVAILABLE → ASSIGNED → ACTIVE ⇄ PAUSED, plus SUSPENDED / DEACTIVATED.
-- LOST / REPLACED are not PRD states; map leftover rows so the enum swap cannot fail.

CREATE TYPE "CardStatus_new" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'DEACTIVATED');

ALTER TABLE "NFCCard" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "NFCCard" ALTER COLUMN "status" TYPE "CardStatus_new" USING (
  CASE "status"::text
    WHEN 'LOST' THEN 'PAUSED'
    WHEN 'REPLACED' THEN 'DEACTIVATED'
    ELSE "status"::text
  END
)::"CardStatus_new";

DROP TYPE "CardStatus";

ALTER TYPE "CardStatus_new" RENAME TO "CardStatus";

ALTER TABLE "NFCCard" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

-- Enforce User FKs that existed as untyped strings

ALTER TABLE "CardAssignment" ADD CONSTRAINT "CardAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- High-traffic lookup indexes

CREATE INDEX "NFCCard_batchId_idx" ON "NFCCard"("batchId");

CREATE INDEX "NFCCard_status_idx" ON "NFCCard"("status");

CREATE INDEX "CardAssignment_userId_idx" ON "CardAssignment"("userId");

CREATE INDEX "CardAssignment_cardId_idx" ON "CardAssignment"("cardId");

CREATE INDEX "ProfileEvent_cardId_timestamp_idx" ON "ProfileEvent"("cardId", "timestamp");

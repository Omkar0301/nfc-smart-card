-- AlterTable: Add cardNumberPrefix to CardType
ALTER TABLE "CardType" ADD COLUMN "cardNumberPrefix" TEXT;

-- Populate existing rows
UPDATE "CardType" SET "cardNumberPrefix" = 'BC' WHERE "slug" = 'business';
UPDATE "CardType" SET "cardNumberPrefix" = 'CC' WHERE "slug" = 'college';
UPDATE "CardType" SET "cardNumberPrefix" = UPPER(SUBSTRING("slug", 1, 2)) WHERE "cardNumberPrefix" IS NULL;

-- Enforce NOT NULL and UNIQUE on cardNumberPrefix
ALTER TABLE "CardType" ALTER COLUMN "cardNumberPrefix" SET NOT NULL;
CREATE UNIQUE INDEX "CardType_cardNumberPrefix_key" ON "CardType"("cardNumberPrefix");

-- CreateTable: GenerationJob
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "generated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_batchId_key" ON "GenerationJob"("batchId");
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");
CREATE INDEX "GenerationJob_cardTypeId_idx" ON "GenerationJob"("cardTypeId");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

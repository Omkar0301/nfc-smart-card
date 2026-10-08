-- CreateTable
CREATE TABLE "CardReplacementRequest" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardReplacementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardReplacementRequest_userId_idx" ON "CardReplacementRequest"("userId");

-- CreateIndex
CREATE INDEX "CardReplacementRequest_cardId_idx" ON "CardReplacementRequest"("cardId");

-- CreateIndex
CREATE INDEX "CardReplacementRequest_status_idx" ON "CardReplacementRequest"("status");

-- AddForeignKey
ALTER TABLE "CardReplacementRequest" ADD CONSTRAINT "CardReplacementRequest_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "NFCCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardReplacementRequest" ADD CONSTRAINT "CardReplacementRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

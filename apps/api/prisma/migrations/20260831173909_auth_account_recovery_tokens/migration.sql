-- CreateTable
CREATE TABLE "AccountRecoveryToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRecoveryToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountRecoveryToken_userId_idx" ON "AccountRecoveryToken"("userId");

-- CreateIndex
CREATE INDEX "AccountRecoveryToken_tokenHash_idx" ON "AccountRecoveryToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "AccountRecoveryToken" ADD CONSTRAINT "AccountRecoveryToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

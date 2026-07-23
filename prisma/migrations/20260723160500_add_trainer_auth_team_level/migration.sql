-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "authUserId" TEXT,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "team" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_authUserId_key" ON "Trainer"("authUserId");

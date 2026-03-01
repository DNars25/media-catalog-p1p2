-- CreateEnum
CREATE TYPE "RequestSource" AS ENUM ('ADMIN', 'VITRINE', 'PEDIDO');

-- AlterTable: drop default, cast to enum, set new enum default
ALTER TABLE "Request" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Request" ALTER COLUMN "source" TYPE "RequestSource" USING "source"::"RequestSource";
ALTER TABLE "Request" ALTER COLUMN "source" SET DEFAULT 'ADMIN'::"RequestSource";

-- CreateIndex
CREATE INDEX "Request_isCorrection_status_idx" ON "Request"("isCorrection", "status");

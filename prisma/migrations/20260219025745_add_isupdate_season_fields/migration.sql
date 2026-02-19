-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "isUpdate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seasonNumber" INTEGER;

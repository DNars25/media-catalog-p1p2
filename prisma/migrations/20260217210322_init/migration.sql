-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TitleType" AS ENUM ('MOVIE', 'TV');

-- CreateEnum
CREATE TYPE "InternalStatus" AS ENUM ('AGUARDANDO_DOWNLOAD', 'DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "TvStatus" AS ENUM ('EM_ANDAMENTO', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "PreferredSystem" AS ENUM ('P1', 'P2', 'AMBOS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "type" "TitleType" NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT,
    "posterUrl" TEXT,
    "releaseYear" INTEGER,
    "genres" JSONB NOT NULL DEFAULT '[]',
    "tvSeasons" INTEGER,
    "tvEpisodes" INTEGER,
    "tvStatus" "TvStatus",
    "internalStatus" "InternalStatus" NOT NULL DEFAULT 'AGUARDANDO_DOWNLOAD',
    "hasP1" BOOLEAN NOT NULL DEFAULT false,
    "hasP2" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "requestedTitle" TEXT NOT NULL,
    "type" "TitleType" NOT NULL,
    "tmdbId" INTEGER,
    "notes" TEXT,
    "preferredSystem" "PreferredSystem",
    "status" "RequestStatus" NOT NULL DEFAULT 'ABERTO',
    "createdById" TEXT NOT NULL,
    "linkedTitleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Title_title_idx" ON "Title"("title");

-- CreateIndex
CREATE INDEX "Title_hasP1_idx" ON "Title"("hasP1");

-- CreateIndex
CREATE INDEX "Title_hasP2_idx" ON "Title"("hasP2");

-- CreateIndex
CREATE INDEX "Title_internalStatus_idx" ON "Title"("internalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Title_tmdbId_type_key" ON "Title"("tmdbId", "type");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_createdAt_idx" ON "Request"("createdAt");

-- AddForeignKey
ALTER TABLE "Title" ADD CONSTRAINT "Title_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_linkedTitleId_fkey" FOREIGN KEY ("linkedTitleId") REFERENCES "Title"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

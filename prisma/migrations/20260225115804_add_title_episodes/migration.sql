-- CreateTable
CREATE TABLE "TitleEpisode" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TitleEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitleEpisode_titleId_idx" ON "TitleEpisode"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "TitleEpisode_titleId_season_episode_key" ON "TitleEpisode"("titleId", "season", "episode");

-- AddForeignKey
ALTER TABLE "TitleEpisode" ADD CONSTRAINT "TitleEpisode_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add requestCount to Request for deduplication counting
ALTER TABLE "Request" ADD COLUMN "requestCount" INTEGER NOT NULL DEFAULT 1;

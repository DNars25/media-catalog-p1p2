ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "priority" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Request_priority_idx" ON "Request"("priority");

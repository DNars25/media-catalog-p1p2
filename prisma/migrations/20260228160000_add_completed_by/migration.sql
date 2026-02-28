ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "completedById" TEXT;
ALTER TABLE "Request" ADD CONSTRAINT "Request_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Request_completedById_idx" ON "Request"("completedById");

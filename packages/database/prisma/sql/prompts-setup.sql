CREATE TABLE IF NOT EXISTS "ComposedPromptRecord" (
  "id" TEXT NOT NULL,
  "promptRunId" TEXT,
  "industry" TEXT NOT NULL,
  "companyName" TEXT,
  "text" TEXT NOT NULL,
  "scores" JSONB NOT NULL,
  "dna" JSONB NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "selectedPrinciples" JSONB NOT NULL DEFAULT '[]',
  "rank" INTEGER,
  "logos" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComposedPromptRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ComposedPromptRecord_promptRunId_idx" ON "ComposedPromptRecord"("promptRunId");
CREATE INDEX IF NOT EXISTS "ComposedPromptRecord_createdAt_idx" ON "ComposedPromptRecord"("createdAt");

ALTER TABLE "ComposedPromptRecord" DROP CONSTRAINT IF EXISTS "ComposedPromptRecord_promptRunId_fkey";
ALTER TABLE "ComposedPromptRecord"
  ADD CONSTRAINT "ComposedPromptRecord_promptRunId_fkey"
  FOREIGN KEY ("promptRunId") REFERENCES "PromptRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComposedPromptRecord" ADD COLUMN IF NOT EXISTS "feedback" TEXT;

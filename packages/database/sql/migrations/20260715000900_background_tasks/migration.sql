CREATE TYPE "BackgroundTaskType" AS ENUM (
  'PDF_INGEST',
  'RESEARCH',
  'NIGHTLY_RESEARCH',
  'CONSOLIDATION'
);

CREATE TYPE "BackgroundTaskStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "background_tasks" (
  "id" TEXT NOT NULL,
  "type" "BackgroundTaskType" NOT NULL,
  "status" "BackgroundTaskStatus" NOT NULL DEFAULT 'PENDING',
  "organization_id" TEXT,
  "project_id" TEXT,
  "requested_by" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" TEXT,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "phase" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 1,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "heartbeat_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "cancel_requested_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "background_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "background_tasks_idempotency_key_key"
  ON "background_tasks"("idempotency_key");

CREATE INDEX "background_tasks_claim_idx"
  ON "background_tasks"("status", "available_at", "created_at");

CREATE INDEX "background_tasks_org_created_idx"
  ON "background_tasks"("organization_id", "created_at" DESC);

CREATE INDEX "background_tasks_heartbeat_idx"
  ON "background_tasks"("status", "heartbeat_at");

REVOKE ALL PRIVILEGES ON TABLE "background_tasks"
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE "background_tasks" ENABLE ROW LEVEL SECURITY;

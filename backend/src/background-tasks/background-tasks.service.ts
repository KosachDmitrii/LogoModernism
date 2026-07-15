import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { db } from '@logo-platform/database';
import {
  BACKGROUND_TASK_STATUSES,
  type BackgroundTask,
  type BackgroundTaskPayload,
  type BackgroundTaskType,
} from './background-task.types';

const STALE_TASK_MS = 5 * 60_000;

@Injectable()
export class BackgroundTasksService {
  async create(input: {
    type: BackgroundTaskType;
    idempotencyKey: string;
    payload: BackgroundTaskPayload;
    organizationId?: string;
    projectId?: string;
    requestedBy?: string;
  }) {
    return db.one<BackgroundTask>(
      `INSERT INTO background_tasks (
         id, type, idempotency_key, payload, organization_id, project_id,
         requested_by, updated_at
       ) VALUES ($1, $2::"BackgroundTaskType", $3, $4::jsonb, $5, $6, $7, NOW())
       ON CONFLICT (idempotency_key) DO UPDATE
         SET idempotency_key = EXCLUDED.idempotency_key
       RETURNING *`,
      [
        randomUUID(),
        input.type,
        input.idempotencyKey,
        JSON.stringify(input.payload),
        input.organizationId ?? null,
        input.projectId ?? null,
        input.requestedBy ?? null,
      ],
    );
  }

  get(id: string, organizationId?: string) {
    return db.maybeOne<BackgroundTask>(
      `SELECT * FROM background_tasks
       WHERE id = $1 AND ($2::text IS NULL OR organization_id = $2)`,
      [id, organizationId ?? null],
    );
  }

  async claimNext() {
    return db.transaction(
      async (tx) => {
        const claimed = await tx.maybeOne<{ id: string }>(
          `SELECT id FROM background_tasks
           WHERE status = 'PENDING'::"BackgroundTaskStatus"
             AND available_at <= NOW()
             AND attempts < max_attempts
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1`,
        );
        if (!claimed) return null;
        return tx.one<BackgroundTask>(
          `UPDATE background_tasks
           SET status = 'RUNNING'::"BackgroundTaskStatus",
               attempts = attempts + 1, started_at = NOW(), heartbeat_at = NOW(),
               error = NULL, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [claimed.id],
        );
      },
    );
  }

  async updateProgress(id: string, progress: number, phase?: string) {
    const rows = await db.query<{ id: string }>(
      `UPDATE background_tasks
       SET progress = $2, phase = $3, heartbeat_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'RUNNING'::"BackgroundTaskStatus"
       RETURNING id`,
      [id, Math.max(0, Math.min(100, Math.round(progress))), phase ?? null],
    );
    return { count: rows.rowCount };
  }

  async heartbeat(id: string) {
    const rows = await db.query<{ id: string }>(
      `UPDATE background_tasks
       SET heartbeat_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'RUNNING'::"BackgroundTaskStatus"
       RETURNING id`,
      [id],
    );
    return { count: rows.rowCount };
  }

  async isCancellationRequested(id: string): Promise<boolean> {
    const task = await db.maybeOne<
      Pick<BackgroundTask, 'cancelRequestedAt' | 'status'>
    >('SELECT cancel_requested_at, status FROM background_tasks WHERE id = $1', [id]);
    return Boolean(
      task?.cancelRequestedAt ||
        task?.status === BACKGROUND_TASK_STATUSES.CANCELLED,
    );
  }

  async cancel(id: string, organizationId?: string) {
    const task = await this.get(id, organizationId);
    if (!task) return null;
    if (
      task.status === BACKGROUND_TASK_STATUSES.SUCCEEDED ||
      task.status === BACKGROUND_TASK_STATUSES.FAILED ||
      task.status === BACKGROUND_TASK_STATUSES.CANCELLED
    ) {
      return task;
    }
    return db.one<BackgroundTask>(
      `UPDATE background_tasks
       SET cancel_requested_at = NOW(),
           status = CASE WHEN status = 'PENDING'::"BackgroundTaskStatus"
             THEN 'CANCELLED'::"BackgroundTaskStatus" ELSE status END,
           finished_at = CASE WHEN status = 'PENDING'::"BackgroundTaskStatus"
             THEN NOW() ELSE finished_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
  }

  succeed(id: string, result: unknown) {
    return db.one<BackgroundTask>(
      `UPDATE background_tasks
       SET status = 'SUCCEEDED'::"BackgroundTaskStatus", progress = 100,
           phase = 'done', result = $2::jsonb, error = NULL,
           finished_at = NOW(), heartbeat_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(result)],
    );
  }

  fail(id: string, error: string) {
    return db.one<BackgroundTask>(
      `UPDATE background_tasks
       SET status = 'FAILED'::"BackgroundTaskStatus", error = $2,
           finished_at = NOW(), heartbeat_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, error],
    );
  }

  markCancelled(id: string) {
    return db.one<BackgroundTask>(
      `UPDATE background_tasks
       SET status = 'CANCELLED'::"BackgroundTaskStatus", error = NULL,
           finished_at = NOW(), heartbeat_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
  }

  async recoverStale() {
    const rows = await db.query<{ id: string }>(
      `UPDATE background_tasks
       SET status = 'PENDING'::"BackgroundTaskStatus",
           attempts = GREATEST(0, attempts - 1),
           started_at = NULL, heartbeat_at = NULL, available_at = NOW(),
           finished_at = NULL,
           updated_at = NOW()
       WHERE status = 'RUNNING'::"BackgroundTaskStatus"
         AND (heartbeat_at IS NULL OR heartbeat_at < $1)
       RETURNING id`,
      [new Date(Date.now() - STALE_TASK_MS)],
    );
    return { count: rows.rowCount };
  }

  async backlog() {
    const result = await db.query<{ status: string; count: number }>(
      'SELECT status, COUNT(*)::int AS count FROM background_tasks GROUP BY status',
    );
    return result.rows;
  }
}

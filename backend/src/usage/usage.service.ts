import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, type DatabaseClient } from '@logo-platform/database';
import {
  PLAN_ENTITLEMENTS,
  USAGE_OPERATIONS,
  type Plan,
  type QuotaKey,
  type QuotaSummary,
  type UsageOperationKey,
  type UsageSummary,
} from '@logo-platform/shared';
import type { TenantScope } from '../auth/tenant-context';

const RESERVATION_TTL_MS = 30 * 60 * 1_000;
const SERIALIZABLE = { isolationLevel: 'SERIALIZABLE' } as const;

type UsageOperation = {
  id: string;
  organizationId: string;
  userId: string | null;
  bucketId: string;
  operationKey: string;
  idempotencyKey: string;
  status: 'RESERVED' | 'PROCESSING' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
  reservedCredits: number;
  includedReservedCredits: number;
  purchasedReservedCredits: number;
  actualCredits: number | null;
};

type UsageBucket = {
  id: string;
  quotaLimit: number | null;
  committedCredits: number;
  reservedCredits: number;
};

function billingPeriod(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function quotaKeyForOperation(operationKey: UsageOperationKey): QuotaKey {
  if (operationKey === USAGE_OPERATIONS.promptCompose) return 'prompt.compose';
  if (operationKey === USAGE_OPERATIONS.imageGenerate) return 'image.generate';
  throw new ConflictException(`Operation ${operationKey} is not metered`);
}

function quotaExceeded(quotaKey: QuotaKey, resetAt: Date): HttpException {
  return new HttpException(
    {
      code: 'QUOTA_EXCEEDED',
      quotaKey,
      message:
        quotaKey === 'prompt.compose'
          ? 'Monthly prompt generation limit is exhausted'
          : 'Monthly logo generation limit is exhausted',
      resetAt: resetAt.toISOString(),
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

async function lockUser(tx: DatabaseClient, userId: string) {
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`usage:${userId}`]);
}

@Injectable()
export class UsageService {
  async reserve(input: {
    tenant: TenantScope;
    operationKey: UsageOperationKey;
    units: number;
    idempotencyKey: string;
    metadata?: unknown;
  }): Promise<UsageOperation> {
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new ConflictException('Reservation units must be a positive integer');
    }
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new ConflictException('Idempotency key is required');
    const quotaKey = quotaKeyForOperation(input.operationKey);

    return db.transaction(async (tx) => {
      await lockUser(tx, input.tenant.userId);
      const existing = await tx.maybeOne<UsageOperation>(
        `SELECT * FROM usage_operations
         WHERE user_id = $1 AND idempotency_key = $2`,
        [input.tenant.userId, idempotencyKey],
      );
      if (existing) {
        if (
          existing.operationKey !== input.operationKey ||
          existing.reservedCredits !== input.units
        ) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Idempotency key was already used for another operation',
          });
        }
        throw new ConflictException({
          code: 'IDEMPOTENCY_REPLAY',
          message: 'This operation is already in progress or completed',
          usageOperationId: existing.id,
        });
      }

      const account = await tx.maybeOne<{ plan: Plan; accessRole: 'ADMIN' | 'USER' }>(
        'SELECT plan, access_role FROM users WHERE id = $1',
        [input.tenant.userId],
      );
      if (!account) throw new NotFoundException('User account not found');

      const quotaExempt = account.accessRole === 'ADMIN';
      const limit = quotaExempt
        ? null
        : PLAN_ENTITLEMENTS[account.plan].monthlyQuotas[quotaKey];
      const period = billingPeriod();
      const bucket = await tx.one<UsageBucket>(
        `INSERT INTO usage_buckets (
           id, organization_id, user_id, period_start, period_end, plan,
           included_credits, quota_key, quota_limit, quota_exempt, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6::"Plan", $7, $8, $9, $10, NOW())
         ON CONFLICT (user_id, period_start, quota_key, quota_exempt)
           WHERE user_id IS NOT NULL
         DO UPDATE SET
           plan = EXCLUDED.plan,
           included_credits = EXCLUDED.included_credits,
           quota_limit = EXCLUDED.quota_limit,
           period_end = EXCLUDED.period_end,
           updated_at = NOW()
         RETURNING id, quota_limit, committed_credits, reserved_credits`,
        [
          randomUUID(),
          input.tenant.organizationId,
          input.tenant.userId,
          period.start,
          period.end,
          account.plan,
          limit ?? 0,
          quotaKey,
          limit,
          quotaExempt,
        ],
      );

      if (
        limit !== null &&
        bucket.committedCredits + bucket.reservedCredits + input.units > limit
      ) {
        throw quotaExceeded(quotaKey, period.end);
      }

      await tx.query(
        `UPDATE usage_buckets
         SET reserved_credits = reserved_credits + $2, updated_at = NOW()
         WHERE id = $1`,
        [bucket.id, input.units],
      );

      return tx.one<UsageOperation>(
        `INSERT INTO usage_operations (
           id, organization_id, user_id, project_id, bucket_id, operation_key,
           idempotency_key, reserved_credits, included_reserved_credits,
           purchased_reserved_credits, metadata, expires_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 0, $9::jsonb, $10, NOW())
         RETURNING *`,
        [
          randomUUID(),
          input.tenant.organizationId,
          input.tenant.userId,
          input.tenant.projectId ?? null,
          bucket.id,
          input.operationKey,
          idempotencyKey,
          input.units,
          JSON.stringify({ quotaKey, ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}) }),
          new Date(Date.now() + RESERVATION_TTL_MS),
        ],
      );
    }, SERIALIZABLE);
  }

  async markProcessing(id: string, jobId?: string) {
    const rows = await db.query<{ id: string }>(
      `UPDATE usage_operations
       SET status = 'PROCESSING'::"UsageReservationStatus", job_id = $2,
           expires_at = $3, updated_at = NOW()
       WHERE id = $1
         AND status IN ('RESERVED'::"UsageReservationStatus", 'PROCESSING'::"UsageReservationStatus")
       RETURNING id`,
      [id, jobId ?? null, new Date(Date.now() + RESERVATION_TTL_MS)],
    );
    return { count: rows.rowCount };
  }

  async commit(id: string, actualUnits?: number): Promise<UsageOperation> {
    return db.transaction(async (tx) => {
      const initial = await tx.maybeOne<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1',
        [id],
      );
      if (!initial) throw new NotFoundException('Usage reservation not found');
      await lockUser(tx, initial.userId ?? initial.organizationId);
      const operation = await tx.one<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (operation.status === 'COMMITTED') return operation;
      if (operation.status === 'RELEASED' || operation.status === 'EXPIRED') {
        throw new ConflictException('Usage reservation is no longer active');
      }
      const charged = actualUnits ?? operation.reservedCredits;
      if (!Number.isInteger(charged) || charged < 0 || charged > operation.reservedCredits) {
        throw new ConflictException('Actual usage exceeds the reservation');
      }

      await tx.query(
        `UPDATE usage_buckets
         SET reserved_credits = reserved_credits - $2,
             committed_credits = committed_credits + $3,
             updated_at = NOW()
         WHERE id = $1`,
        [operation.bucketId, operation.reservedCredits, charged],
      );
      return tx.one<UsageOperation>(
        `UPDATE usage_operations
         SET status = 'COMMITTED'::"UsageReservationStatus",
             actual_credits = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, charged],
      );
    }, SERIALIZABLE);
  }

  async release(id: string): Promise<UsageOperation> {
    return db.transaction(async (tx) => {
      const initial = await tx.maybeOne<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1',
        [id],
      );
      if (!initial) throw new NotFoundException('Usage reservation not found');
      await lockUser(tx, initial.userId ?? initial.organizationId);
      const operation = await tx.one<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (operation.status === 'RELEASED' || operation.status === 'EXPIRED') {
        return operation;
      }
      if (operation.status === 'COMMITTED') {
        throw new ConflictException('Committed usage cannot be released');
      }
      await tx.query(
        `UPDATE usage_buckets
         SET reserved_credits = reserved_credits - $2, updated_at = NOW()
         WHERE id = $1`,
        [operation.bucketId, operation.reservedCredits],
      );
      return tx.one<UsageOperation>(
        `UPDATE usage_operations
         SET status = 'RELEASED'::"UsageReservationStatus",
             actual_credits = 0, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id],
      );
    }, SERIALIZABLE);
  }

  async reapExpired(limit = 100): Promise<number> {
    const expired = await db.query<{ id: string }>(
      `SELECT id FROM usage_operations
       WHERE status = 'RESERVED'::"UsageReservationStatus"
         AND expires_at < NOW()
       ORDER BY expires_at ASC LIMIT $1`,
      [limit],
    );
    let released = 0;
    for (const operation of expired.rows) {
      try {
        await this.release(operation.id);
        const rows = await db.query<{ id: string }>(
          `UPDATE usage_operations
           SET status = 'EXPIRED'::"UsageReservationStatus", updated_at = NOW()
           WHERE id = $1 AND status = 'RELEASED'::"UsageReservationStatus"
           RETURNING id`,
          [operation.id],
        );
        released += rows.rowCount;
      } catch {
        // Another process may have committed or released it.
      }
    }
    return released;
  }

  async summary(tenant: TenantScope): Promise<UsageSummary> {
    const period = billingPeriod();
    const account = await db.maybeOne<{ plan: Plan; accessRole: 'ADMIN' | 'USER' }>(
      'SELECT plan, access_role FROM users WHERE id = $1',
      [tenant.userId],
    );
    if (!account) throw new NotFoundException('User account not found');
    const exempt = account.accessRole === 'ADMIN';
    const buckets = await db.query<{
      quotaKey: string;
      committedCredits: number;
      reservedCredits: number;
    }>(
      `SELECT quota_key, committed_credits, reserved_credits
       FROM usage_buckets
       WHERE user_id = $1 AND period_start = $2
         AND quota_key IN ('prompt.compose', 'image.generate')
         AND quota_exempt = $3`,
      [tenant.userId, period.start, exempt],
    );
    const byKey = new Map(buckets.rows.map((row) => [row.quotaKey, row]));
    const summarize = (key: QuotaKey): QuotaSummary => {
      const row = byKey.get(key);
      const used = row?.committedCredits ?? 0;
      const reserved = row?.reservedCredits ?? 0;
      const limit = exempt ? null : PLAN_ENTITLEMENTS[account.plan].monthlyQuotas[key];
      return {
        limit,
        used,
        reserved,
        remaining: limit === null ? null : Math.max(0, limit - used - reserved),
      };
    };
    return {
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      prompts: summarize('prompt.compose'),
      logos: summarize('image.generate'),
    };
  }
}

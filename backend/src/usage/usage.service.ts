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
  type Plan,
  type UsageOperationKey,
  type UsageSummary,
} from '@logo-platform/shared';
import type { TenantScope } from '../auth/tenant-context';

const RESERVATION_TTL_MS = 30 * 60 * 1_000;
const UNLIMITED_BUCKET_CREDITS = 1_000_000_000;
const SERIALIZABLE = { isolationLevel: 'SERIALIZABLE' } as const;

type UsageOperation = {
  id: string;
  organizationId: string;
  userId: string | null;
  projectId: string | null;
  bucketId: string;
  operationKey: string;
  idempotencyKey: string;
  status: 'RESERVED' | 'PROCESSING' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
  reservedCredits: number;
  includedReservedCredits: number;
  purchasedReservedCredits: number;
  actualCredits: number | null;
  jobId: string | null;
  metadata: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function billingPeriod(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function quotaExceeded(resetAt: Date): HttpException {
  return new HttpException(
    {
      code: 'QUOTA_EXCEEDED',
      message: 'Monthly AI credits are exhausted',
      resetAt: resetAt.toISOString(),
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

async function lockOrganization(tx: DatabaseClient, organizationId: string) {
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [organizationId]);
}

@Injectable()
export class UsageService {
  async reserve(input: {
    tenant: TenantScope;
    operationKey: UsageOperationKey;
    credits: number;
    idempotencyKey: string;
    metadata?: unknown;
  }) {
    if (!Number.isInteger(input.credits) || input.credits <= 0) {
      throw new ConflictException('Reservation credits must be a positive integer');
    }
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new ConflictException('Idempotency key is required');

    return db.transaction(async (tx) => {
      await lockOrganization(tx, input.tenant.organizationId);
      const existing = await tx.maybeOne<UsageOperation>(
        `SELECT * FROM usage_operations
         WHERE organization_id = $1 AND idempotency_key = $2`,
        [input.tenant.organizationId, idempotencyKey],
      );
      if (existing) {
        if (
          existing.operationKey !== input.operationKey ||
          existing.reservedCredits !== input.credits
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

      const organization = await tx.maybeOne<{ plan: Plan }>(
        'SELECT plan FROM organizations WHERE id = $1',
        [input.tenant.organizationId],
      );
      if (!organization) throw new NotFoundException('Organization not found');

      const plan = organization.plan;
      const includedCredits =
        PLAN_ENTITLEMENTS[plan].monthlyCredits ?? UNLIMITED_BUCKET_CREDITS;
      const period = billingPeriod();
      const bucket = await tx.one<{
        id: string;
        includedCredits: number;
        committedCredits: number;
        reservedCredits: number;
      }>(
        `INSERT INTO usage_buckets (
           id, organization_id, period_start, period_end, plan,
           included_credits, updated_at
         ) VALUES ($1, $2, $3, $4, $5::"Plan", $6, NOW())
         ON CONFLICT (organization_id, period_start) DO UPDATE
           SET plan = EXCLUDED.plan, included_credits = EXCLUDED.included_credits,
               period_end = EXCLUDED.period_end, updated_at = NOW()
         RETURNING id, included_credits, committed_credits, reserved_credits`,
        [
          randomUUID(),
          input.tenant.organizationId,
          period.start,
          period.end,
          plan,
          includedCredits,
        ],
      );
      const balance = await tx.one<{ availableCredits: number }>(
        `INSERT INTO credit_balances (organization_id, updated_at)
         VALUES ($1, NOW())
         ON CONFLICT (organization_id) DO UPDATE SET updated_at = NOW()
         RETURNING available_credits`,
        [input.tenant.organizationId],
      );

      const includedAvailable = Math.max(
        0,
        bucket.includedCredits - bucket.committedCredits - bucket.reservedCredits,
      );
      const includedReservedCredits = Math.min(includedAvailable, input.credits);
      const purchasedReservedCredits = input.credits - includedReservedCredits;
      if (purchasedReservedCredits > balance.availableCredits) {
        throw quotaExceeded(period.end);
      }

      await tx.query(
        `UPDATE usage_buckets
         SET reserved_credits = reserved_credits + $2, updated_at = NOW()
         WHERE id = $1`,
        [bucket.id, includedReservedCredits],
      );
      if (purchasedReservedCredits > 0) {
        const debited = await tx.maybeOne<{ organizationId: string }>(
          `UPDATE credit_balances
           SET available_credits = available_credits - $2, updated_at = NOW()
           WHERE organization_id = $1 AND available_credits >= $2
           RETURNING organization_id`,
          [input.tenant.organizationId, purchasedReservedCredits],
        );
        if (!debited) throw quotaExceeded(period.end);
      }

      return tx.one<UsageOperation>(
        `INSERT INTO usage_operations (
           id, organization_id, user_id, project_id, bucket_id, operation_key,
           idempotency_key, reserved_credits, included_reserved_credits,
           purchased_reserved_credits, metadata, expires_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, NOW())
         RETURNING *`,
        [
          randomUUID(),
          input.tenant.organizationId,
          input.tenant.userId,
          input.tenant.projectId ?? null,
          bucket.id,
          input.operationKey,
          idempotencyKey,
          input.credits,
          includedReservedCredits,
          purchasedReservedCredits,
          JSON.stringify(input.metadata ?? {}),
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

  async commit(id: string, actualCredits?: number) {
    return db.transaction(async (tx) => {
      const initial = await tx.maybeOne<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1',
        [id],
      );
      if (!initial) throw new NotFoundException('Usage reservation not found');
      await lockOrganization(tx, initial.organizationId);
      const operation = await tx.one<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (operation.status === 'COMMITTED') return operation;
      if (operation.status === 'RELEASED' || operation.status === 'EXPIRED') {
        throw new ConflictException('Usage reservation is no longer active');
      }
      const charged = actualCredits ?? operation.reservedCredits;
      if (!Number.isInteger(charged) || charged < 0 || charged > operation.reservedCredits) {
        throw new ConflictException('Actual credits exceed the reservation');
      }
      const includedCharged = Math.min(charged, operation.includedReservedCredits);
      const purchasedCharged = Math.max(0, charged - includedCharged);
      const purchasedRefund = operation.purchasedReservedCredits - purchasedCharged;

      await tx.query(
        `UPDATE usage_buckets
         SET reserved_credits = reserved_credits - $2,
             committed_credits = committed_credits + $3, updated_at = NOW()
         WHERE id = $1`,
        [operation.bucketId, operation.includedReservedCredits, includedCharged],
      );
      if (purchasedRefund > 0) {
        await tx.query(
          `UPDATE credit_balances
           SET available_credits = available_credits + $2, updated_at = NOW()
           WHERE organization_id = $1`,
          [operation.organizationId, purchasedRefund],
        );
      }
      return tx.one<UsageOperation>(
        `UPDATE usage_operations
         SET status = 'COMMITTED'::"UsageReservationStatus",
             actual_credits = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, charged],
      );
    }, SERIALIZABLE);
  }

  async release(id: string) {
    return db.transaction(async (tx) => {
      const initial = await tx.maybeOne<UsageOperation>(
        'SELECT * FROM usage_operations WHERE id = $1',
        [id],
      );
      if (!initial) throw new NotFoundException('Usage reservation not found');
      await lockOrganization(tx, initial.organizationId);
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
        [operation.bucketId, operation.includedReservedCredits],
      );
      if (operation.purchasedReservedCredits > 0) {
        await tx.query(
          `UPDATE credit_balances
           SET available_credits = available_credits + $2, updated_at = NOW()
           WHERE organization_id = $1`,
          [operation.organizationId, operation.purchasedReservedCredits],
        );
      }
      return tx.one<UsageOperation>(
        `UPDATE usage_operations
         SET status = 'RELEASED'::"UsageReservationStatus",
             actual_credits = 0, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id],
      );
    }, SERIALIZABLE);
  }

  async grantPurchasedCredits(organizationId: string, credits: number): Promise<void> {
    if (!Number.isInteger(credits) || credits <= 0) return;
    await db.query(
      `INSERT INTO credit_balances (organization_id, available_credits, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (organization_id) DO UPDATE
         SET available_credits = credit_balances.available_credits + EXCLUDED.available_credits,
             updated_at = NOW()`,
      [organizationId, credits],
    );
  }

  async reapExpired(limit = 100): Promise<number> {
    const expired = await db.query<{ id: string }>(
      `SELECT id FROM usage_operations
       WHERE status IN ('RESERVED'::"UsageReservationStatus", 'PROCESSING'::"UsageReservationStatus")
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

  async summary(organizationId: string): Promise<UsageSummary> {
    const period = billingPeriod();
    const [organization, bucket, balance] = await Promise.all([
      db.maybeOne<{ plan: Plan }>('SELECT plan FROM organizations WHERE id = $1', [
        organizationId,
      ]),
      db.maybeOne<{ committedCredits: number; reservedCredits: number }>(
        `SELECT committed_credits, reserved_credits FROM usage_buckets
         WHERE organization_id = $1 AND period_start = $2`,
        [organizationId, period.start],
      ),
      db.maybeOne<{ availableCredits: number }>(
        'SELECT available_credits FROM credit_balances WHERE organization_id = $1',
        [organizationId],
      ),
    ]);
    if (!organization) throw new NotFoundException('Organization not found');

    const includedCredits = PLAN_ENTITLEMENTS[organization.plan].monthlyCredits;
    const committedCredits = bucket?.committedCredits ?? 0;
    const reservedCredits = bucket?.reservedCredits ?? 0;
    const purchasedCredits = balance?.availableCredits ?? 0;
    const remainingCredits =
      includedCredits === null
        ? null
        : Math.max(0, includedCredits - committedCredits - reservedCredits) +
          purchasedCredits;
    return {
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      includedCredits,
      committedCredits,
      reservedCredits,
      purchasedCredits,
      remainingCredits,
    };
  }
}

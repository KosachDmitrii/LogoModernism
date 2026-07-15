import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, prisma } from '@logo-platform/database';
import {
  PLAN_ENTITLEMENTS,
  type Plan,
  type UsageOperationKey,
  type UsageSummary,
} from '@logo-platform/shared';
import type { TenantScope } from '../auth/tenant-context';

const RESERVATION_TTL_MS = 30 * 60 * 1_000;
const UNLIMITED_BUCKET_CREDITS = 1_000_000_000;

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

@Injectable()
export class UsageService {
  async reserve(input: {
    tenant: TenantScope;
    operationKey: UsageOperationKey;
    credits: number;
    idempotencyKey: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    if (!Number.isInteger(input.credits) || input.credits <= 0) {
      throw new ConflictException('Reservation credits must be a positive integer');
    }
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new ConflictException('Idempotency key is required');

    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.tenant.organizationId}))`;

        const existing = await tx.usageOperation.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: input.tenant.organizationId,
              idempotencyKey,
            },
          },
        });
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

        const organization = await tx.organization.findUnique({
          where: { id: input.tenant.organizationId },
          select: { plan: true },
        });
        if (!organization) throw new NotFoundException('Organization not found');

        const plan = organization.plan as Plan;
        const entitlement = PLAN_ENTITLEMENTS[plan];
        const includedCredits = entitlement.monthlyCredits ?? UNLIMITED_BUCKET_CREDITS;
        const period = billingPeriod();
        const bucket = await tx.usageBucket.upsert({
          where: {
            organizationId_periodStart: {
              organizationId: input.tenant.organizationId,
              periodStart: period.start,
            },
          },
          create: {
            organizationId: input.tenant.organizationId,
            periodStart: period.start,
            periodEnd: period.end,
            plan,
            includedCredits,
          },
          update: {
            plan,
            includedCredits,
            periodEnd: period.end,
          },
        });
        const balance = await tx.creditBalance.upsert({
          where: { organizationId: input.tenant.organizationId },
          create: { organizationId: input.tenant.organizationId },
          update: {},
        });

        const includedAvailable = Math.max(
          0,
          bucket.includedCredits - bucket.committedCredits - bucket.reservedCredits,
        );
        const includedReservedCredits = Math.min(includedAvailable, input.credits);
        const purchasedReservedCredits = input.credits - includedReservedCredits;
        if (purchasedReservedCredits > balance.availableCredits) {
          throw quotaExceeded(period.end);
        }

        await tx.usageBucket.update({
          where: { id: bucket.id },
          data: { reservedCredits: { increment: includedReservedCredits } },
        });
        if (purchasedReservedCredits > 0) {
          await tx.creditBalance.update({
            where: { organizationId: input.tenant.organizationId },
            data: { availableCredits: { decrement: purchasedReservedCredits } },
          });
        }

        return tx.usageOperation.create({
          data: {
            organizationId: input.tenant.organizationId,
            userId: input.tenant.userId,
            projectId: input.tenant.projectId,
            bucketId: bucket.id,
            operationKey: input.operationKey,
            idempotencyKey,
            reservedCredits: input.credits,
            includedReservedCredits,
            purchasedReservedCredits,
            metadata: input.metadata ?? {},
            expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async markProcessing(id: string, jobId?: string) {
    return prisma.usageOperation.updateMany({
      where: { id, status: { in: ['RESERVED', 'PROCESSING'] } },
      data: {
        status: 'PROCESSING',
        jobId,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      },
    });
  }

  async commit(id: string, actualCredits?: number) {
    return prisma.$transaction(
      async (tx) => {
        const operation = await tx.usageOperation.findUnique({ where: { id } });
        if (!operation) throw new NotFoundException('Usage reservation not found');
        if (operation.status === 'COMMITTED') return operation;
        if (['RELEASED', 'EXPIRED'].includes(operation.status)) {
          throw new ConflictException('Usage reservation is no longer active');
        }

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${operation.organizationId}))`;
        const charged = actualCredits ?? operation.reservedCredits;
        if (!Number.isInteger(charged) || charged < 0 || charged > operation.reservedCredits) {
          throw new ConflictException('Actual credits exceed the reservation');
        }
        const includedCharged = Math.min(charged, operation.includedReservedCredits);
        const purchasedCharged = Math.max(0, charged - includedCharged);
        const purchasedRefund =
          operation.purchasedReservedCredits - purchasedCharged;

        await tx.usageBucket.update({
          where: { id: operation.bucketId },
          data: {
            reservedCredits: { decrement: operation.includedReservedCredits },
            committedCredits: { increment: includedCharged },
          },
        });
        if (purchasedRefund > 0) {
          await tx.creditBalance.update({
            where: { organizationId: operation.organizationId },
            data: { availableCredits: { increment: purchasedRefund } },
          });
        }
        return tx.usageOperation.update({
          where: { id },
          data: { status: 'COMMITTED', actualCredits: charged },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async release(id: string) {
    return prisma.$transaction(
      async (tx) => {
        const operation = await tx.usageOperation.findUnique({ where: { id } });
        if (!operation) throw new NotFoundException('Usage reservation not found');
        if (['RELEASED', 'EXPIRED'].includes(operation.status)) return operation;
        if (operation.status === 'COMMITTED') {
          throw new ConflictException('Committed usage cannot be released');
        }

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${operation.organizationId}))`;
        await tx.usageBucket.update({
          where: { id: operation.bucketId },
          data: {
            reservedCredits: { decrement: operation.includedReservedCredits },
          },
        });
        if (operation.purchasedReservedCredits > 0) {
          await tx.creditBalance.update({
            where: { organizationId: operation.organizationId },
            data: {
              availableCredits: { increment: operation.purchasedReservedCredits },
            },
          });
        }
        return tx.usageOperation.update({
          where: { id },
          data: { status: 'RELEASED', actualCredits: 0 },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async grantPurchasedCredits(organizationId: string, credits: number): Promise<void> {
    if (!Number.isInteger(credits) || credits <= 0) return;
    await prisma.creditBalance.upsert({
      where: { organizationId },
      create: { organizationId, availableCredits: credits },
      update: { availableCredits: { increment: credits } },
    });
  }

  async reapExpired(limit = 100): Promise<number> {
    const expired = await prisma.usageOperation.findMany({
      where: {
        status: { in: ['RESERVED', 'PROCESSING'] },
        expiresAt: { lt: new Date() },
      },
      select: { id: true },
      take: limit,
    });
    let released = 0;
    for (const operation of expired) {
      try {
        await this.release(operation.id);
        await prisma.usageOperation.updateMany({
          where: { id: operation.id, status: 'RELEASED' },
          data: { status: 'EXPIRED' },
        });
        released += 1;
      } catch {
        // Another API/worker instance may have committed or released it.
      }
    }
    return released;
  }

  async summary(organizationId: string): Promise<UsageSummary> {
    const period = billingPeriod();
    const [organization, bucket, balance] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
      }),
      prisma.usageBucket.findUnique({
        where: {
          organizationId_periodStart: {
            organizationId,
            periodStart: period.start,
          },
        },
      }),
      prisma.creditBalance.findUnique({ where: { organizationId } }),
    ]);
    if (!organization) throw new NotFoundException('Organization not found');

    const plan = organization.plan as Plan;
    const includedCredits = PLAN_ENTITLEMENTS[plan].monthlyCredits;
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

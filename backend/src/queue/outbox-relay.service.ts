import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@logo-platform/database';
import { JOB_PAYLOAD_VERSION, QUEUE_NAMES } from '@logo-platform/shared';
import { QueueService } from './queue.service';
import { isAsyncQueueEnabled } from './queue.config';

type ClaimedEvent = {
  id: string;
  event_type: string;
  payload: unknown;
  idempotency_key: string;
  attempts: number;
};

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly queues: QueueService) {}

  onModuleInit(): void {
    if (!isAsyncQueueEnabled()) return;
    this.timer = setInterval(() => void this.flush(), 1_000);
    this.timer.unref();
    void this.flush();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await prisma.$queryRawUnsafe<ClaimedEvent[]>(`
        WITH selected AS (
          SELECT id
          FROM outbox_events
          WHERE (
            status = 'pending'
            OR (status = 'processing' AND available_at <= NOW())
          )
          AND available_at <= NOW()
          ORDER BY created_at
          LIMIT 25
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_events AS event
        SET status = 'processing',
            attempts = event.attempts + 1,
            available_at = NOW() + INTERVAL '5 minutes'
        FROM selected
        WHERE event.id = selected.id
        RETURNING event.id, event.event_type, event.payload,
                  event.idempotency_key, event.attempts
      `);
      for (const event of events) await this.publish(event);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      this.running = false;
    }
  }

  private async publish(event: ClaimedEvent): Promise<void> {
    try {
      if (
        event.event_type === 'prompt.saved' ||
        event.event_type === 'prompt.feedback' ||
        event.event_type === 'logo.feedback' ||
        event.event_type === 'logo.tags'
      ) {
        const payload = event.payload as {
          promptId: string;
          actorId?: string;
          organizationId?: string;
          projectId?: string;
          rating?: number;
          verdict?: 'approved' | 'rejected' | 'needs-revision';
          comments?: string;
          tags?: string[];
        };
        await this.queues.enqueue(QUEUE_NAMES.feedback, {
          version: JOB_PAYLOAD_VERSION,
          idempotencyKey: event.idempotency_key,
          requestedAt: new Date().toISOString(),
          promptRecordId: payload.promptId,
          rating: payload.rating,
          verdict:
            payload.verdict ?? (event.event_type === 'prompt.saved' ? 'approved' : undefined),
          comments:
            payload.comments ??
            (event.event_type === 'prompt.saved' ? 'Prompt saved to favorites' : undefined),
          tags: payload.tags,
          actorId: payload.actorId,
          organizationId: payload.organizationId,
          projectId: payload.projectId,
        });
      }
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'processed', processedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = event.attempts >= 5;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: exhausted ? 'dead_letter' : 'pending',
          availableAt: new Date(Date.now() + Math.min(60_000, 1_000 * 2 ** event.attempts)),
          lastError: message.slice(0, 2_000),
        },
      });
    }
  }
}

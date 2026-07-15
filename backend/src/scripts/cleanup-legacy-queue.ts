import 'dotenv/config';
import Redis from 'ioredis';
import { db } from '@logo-platform/database';
import { UsageService } from '../usage/usage.service';

const QUEUE_NAMES = [
  'prompt',
  'image',
  'feedback',
  'pdf',
  'research',
  'consolidation',
];

async function clearLegacyRedis(): Promise<number> {
  if (!process.env.REDIS_URL) return 0;
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
  });
  const prefix = process.env.QUEUE_PREFIX ?? 'logo-platform';
  let deleted = 0;
  try {
    for (const queue of QUEUE_NAMES) {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${prefix}:${queue}:*`,
          'COUNT',
          500,
        );
        cursor = nextCursor;
        if (keys.length) deleted += await redis.del(...keys);
      } while (cursor !== '0');
    }
  } finally {
    await redis.quit();
  }
  return deleted;
}

async function main(): Promise<void> {
  if (!process.argv.includes('--confirm')) {
    throw new Error('Pass --confirm to run the one-time cleanup');
  }

  const usage = new UsageService();
  let expiredReservations = 0;
  while (true) {
    const count = await usage.reapExpired(500);
    expiredReservations += count;
    if (count < 500) break;
  }

  const [placeholders, outboxEvents, redisKeys] = await Promise.all([
    db.query<{ id: string }>(
      `DELETE FROM generated_logos
       WHERE public_url IS NULL AND storage_key IS NULL
         AND created_at < $1 AND metadata @> '{"queued":true}'::jsonb
       RETURNING id`,
      [new Date(Date.now() - 30 * 60_000)],
    ),
    db.query<{ id: string }>(
      `DELETE FROM outbox_events
       WHERE status IN ('pending', 'processing')
       RETURNING id`,
    ),
    clearLegacyRedis(),
  ]);

  console.log(
    JSON.stringify({
      expiredReservations,
      deletedLogoPlaceholders: placeholders.rowCount,
      deletedOutboxEvents: outboxEvents.rowCount,
      deletedRedisKeys: redisKeys,
    }),
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

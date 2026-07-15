import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { WebhookVerifierService } from '../../src/billing/webhook-verifier.service';

describe('Lemon Squeezy webhook verification', () => {
  const originalSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    } else {
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = originalSecret;
    }
  });

  it('accepts the HMAC of the exact raw body', () => {
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'test-secret';
    const payload = Buffer.from('{"data":{"id":"1"}}');
    const signature = createHmac('sha256', 'test-secret').update(payload).digest('hex');

    expect(() => new WebhookVerifierService().verify(payload, signature)).not.toThrow();
  });

  it.each([undefined, '', 'wrong', '0'.repeat(64)])(
    'rejects an invalid signature',
    (signature) => {
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'test-secret';
      expect(() =>
        new WebhookVerifierService().verify(Buffer.from('{}'), signature),
      ).toThrow('Invalid webhook signature');
    },
  );
});

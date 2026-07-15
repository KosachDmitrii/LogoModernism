import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class WebhookVerifierService {
  verify(payload: Buffer, signature?: string): void {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'LEMON_SQUEEZY_WEBHOOK_SECRET is not configured',
      );
    }
    if (!signature || !/^[a-f\d]{64}$/i.test(signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    const expected = createHmac('sha256', secret).update(payload).digest();
    const received = Buffer.from(signature, 'hex');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}

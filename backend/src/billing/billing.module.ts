import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { LemonSqueezyClient } from './lemon-squeezy.client';
import { WebhookVerifierService } from './webhook-verifier.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, LemonSqueezyClient, WebhookVerifierService],
  exports: [BillingService],
})
export class BillingModule {}

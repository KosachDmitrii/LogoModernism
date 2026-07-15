import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { OutboxRelayService } from './outbox-relay.service';
import { QueueCancellationService } from './queue-cancellation.service';

@Module({
  controllers: [QueueController],
  providers: [QueueService, QueueCancellationService, OutboxRelayService],
  exports: [QueueService, QueueCancellationService],
})
export class QueueModule {}

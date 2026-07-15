import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { OutboxRelayService } from './outbox-relay.service';

@Module({
  controllers: [QueueController],
  providers: [QueueService, OutboxRelayService],
  exports: [QueueService],
})
export class QueueModule {}

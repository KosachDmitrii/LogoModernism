import { Module } from '@nestjs/common';
import { DesignBrainController } from './design-brain.controller';
import { DesignBrainApiService } from './design-brain.service';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { NightlyBrainSchedulerService } from './nightly-brain-scheduler.service';

@Module({
  imports: [QueueModule, StorageModule],
  controllers: [DesignBrainController],
  providers: [DesignBrainApiService, NightlyBrainSchedulerService],
})
export class DesignBrainModule {}

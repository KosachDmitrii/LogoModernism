import { Module } from '@nestjs/common';
import { DesignBrainController } from './design-brain.controller';
import { DesignBrainApiService } from './design-brain.service';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [QueueModule, StorageModule],
  controllers: [DesignBrainController],
  providers: [DesignBrainApiService],
})
export class DesignBrainModule {}

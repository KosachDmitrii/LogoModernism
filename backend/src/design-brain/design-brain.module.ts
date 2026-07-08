import { Module } from '@nestjs/common';
import { DesignBrainController } from './design-brain.controller';
import { DesignBrainApiService } from './design-brain.service';

@Module({
  controllers: [DesignBrainController],
  providers: [DesignBrainApiService],
})
export class DesignBrainModule {}

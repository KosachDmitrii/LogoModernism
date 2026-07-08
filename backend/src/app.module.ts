import { Module } from '@nestjs/common';
import { DesignBrainModule } from './design-brain/design-brain.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DesignBrainModule],
  controllers: [HealthController],
})
export class AppModule {}

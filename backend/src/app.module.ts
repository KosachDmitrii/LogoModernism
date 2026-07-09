import { Module } from '@nestjs/common';
import { PromptsModule } from './prompts/prompts.module';
import { PrinciplesModule } from './principles/principles.module';
import { EnginesModule } from './engines/engines.module';
import { ImagesModule } from './images/images.module';
import { DesignBrainModule } from './design-brain/design-brain.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PromptsModule, PrinciplesModule, EnginesModule, ImagesModule, DesignBrainModule],
  controllers: [HealthController],
})
export class AppModule {}

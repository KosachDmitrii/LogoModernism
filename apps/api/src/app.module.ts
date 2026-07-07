import { Module } from '@nestjs/common';
import { PromptsModule } from './prompts/prompts.module';
import { PrinciplesModule } from './principles/principles.module';
import { EnginesModule } from './engines/engines.module';
import { ImagesModule } from './images/images.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PromptsModule, PrinciplesModule, EnginesModule, ImagesModule],
  controllers: [HealthController],
})
export class AppModule {}

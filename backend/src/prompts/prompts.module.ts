import { Module } from '@nestjs/common';
import { ImagesModule } from '../images/images.module';
import { PromptsController } from './prompts.controller';
import { PromptRecordsService } from './prompt-records.service';
import { PromptsService } from './prompts.service';

@Module({
  imports: [ImagesModule],
  controllers: [PromptsController],
  providers: [PromptsService, PromptRecordsService],
})
export class PromptsModule {}

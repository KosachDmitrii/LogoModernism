import { Module } from '@nestjs/common';
import { ImagesModule } from '../images/images.module';
import { PromptsController } from './prompts.controller';
import { PromptRecordsService } from './prompt-records.service';
import { PromptsService } from './prompts.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ImagesModule, StorageModule],
  controllers: [PromptsController],
  providers: [PromptsService, PromptRecordsService],
  exports: [PromptsService],
})
export class PromptsModule {}

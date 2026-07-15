import { Module } from '@nestjs/common';
import { QueueModule } from './queue/queue.module';
import { ConsolidationProcessor } from './queue/processors/consolidation.processor';
import { FeedbackProcessor } from './queue/processors/feedback.processor';
import { ImageProcessor } from './queue/processors/image.processor';
import { PdfProcessor } from './queue/processors/pdf.processor';
import { ResearchProcessor } from './queue/processors/research.processor';
import { StorageModule } from './storage/storage.module';
import {
  CONSOLIDATION_JOB_HANDLER,
  FEEDBACK_JOB_HANDLER,
  IMAGE_JOB_HANDLER,
  PDF_JOB_HANDLER,
  RESEARCH_JOB_HANDLER,
  PROMPT_JOB_HANDLER,
} from './queue/queue.constants';
import {
  ConsolidationJobHandlerService,
  FeedbackJobHandlerService,
  ImageJobHandlerService,
  PdfJobHandlerService,
  ResearchJobHandlerService,
  PromptJobHandlerService,
} from './queue/job-handlers.service';
import { DatabaseShutdownService } from './common/database-shutdown.service';
import { PromptProcessor } from './queue/processors/prompt.processor';
import { PromptsModule } from './prompts/prompts.module';

@Module({
  imports: [QueueModule, StorageModule, PromptsModule],
  providers: [
    FeedbackProcessor,
    PdfProcessor,
    ImageProcessor,
    ResearchProcessor,
    ConsolidationProcessor,
    PromptProcessor,
    FeedbackJobHandlerService,
    PdfJobHandlerService,
    ImageJobHandlerService,
    ResearchJobHandlerService,
    ConsolidationJobHandlerService,
    PromptJobHandlerService,
    DatabaseShutdownService,
    { provide: FEEDBACK_JOB_HANDLER, useExisting: FeedbackJobHandlerService },
    { provide: PDF_JOB_HANDLER, useExisting: PdfJobHandlerService },
    { provide: IMAGE_JOB_HANDLER, useExisting: ImageJobHandlerService },
    { provide: RESEARCH_JOB_HANDLER, useExisting: ResearchJobHandlerService },
    { provide: CONSOLIDATION_JOB_HANDLER, useExisting: ConsolidationJobHandlerService },
    { provide: PROMPT_JOB_HANDLER, useExisting: PromptJobHandlerService },
  ],
})
export class WorkerModule {}

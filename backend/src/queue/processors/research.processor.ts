import { Inject, Injectable, Optional } from '@nestjs/common';
import { QUEUE_NAMES, ResearchJobPayload } from '@logo-platform/shared';
import {
  RESEARCH_JOB_HANDLER,
  ResearchJobHandler,
} from '../queue.constants';
import { QueueCancellationService } from '../queue-cancellation.service';
import { BaseQueueProcessor } from './base.processor';

@Injectable()
export class ResearchProcessor extends BaseQueueProcessor<ResearchJobPayload> {
  constructor(
    cancellation: QueueCancellationService,
    @Optional()
    @Inject(RESEARCH_JOB_HANDLER)
    handler?: ResearchJobHandler,
  ) {
    super(QUEUE_NAMES.research, handler, cancellation);
  }
}

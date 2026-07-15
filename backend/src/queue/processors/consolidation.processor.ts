import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ConsolidationJobPayload,
  QUEUE_NAMES,
} from '@logo-platform/shared';
import {
  CONSOLIDATION_JOB_HANDLER,
  ConsolidationJobHandler,
} from '../queue.constants';
import { BaseQueueProcessor } from './base.processor';

@Injectable()
export class ConsolidationProcessor extends BaseQueueProcessor<ConsolidationJobPayload> {
  constructor(
    @Optional()
    @Inject(CONSOLIDATION_JOB_HANDLER)
    handler?: ConsolidationJobHandler,
  ) {
    super(QUEUE_NAMES.consolidation, handler);
  }
}

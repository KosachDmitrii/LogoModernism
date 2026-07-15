import { Inject, Injectable, Optional } from '@nestjs/common';
import { FeedbackJobPayload, QUEUE_NAMES } from '@logo-platform/shared';
import {
  FEEDBACK_JOB_HANDLER,
  FeedbackJobHandler,
} from '../queue.constants';
import { BaseQueueProcessor } from './base.processor';

@Injectable()
export class FeedbackProcessor extends BaseQueueProcessor<FeedbackJobPayload> {
  constructor(
    @Optional()
    @Inject(FEEDBACK_JOB_HANDLER)
    handler?: FeedbackJobHandler,
  ) {
    super(QUEUE_NAMES.feedback, handler);
  }
}

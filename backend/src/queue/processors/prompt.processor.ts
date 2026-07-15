import { Inject, Injectable, Optional } from '@nestjs/common';
import { PromptJobPayload, QUEUE_NAMES } from '@logo-platform/shared';
import { PROMPT_JOB_HANDLER, PromptJobHandler } from '../queue.constants';
import { BaseQueueProcessor } from './base.processor';

@Injectable()
export class PromptProcessor extends BaseQueueProcessor<PromptJobPayload> {
  constructor(
    @Optional()
    @Inject(PROMPT_JOB_HANDLER)
    handler?: PromptJobHandler,
  ) {
    super(QUEUE_NAMES.prompt, handler);
  }
}

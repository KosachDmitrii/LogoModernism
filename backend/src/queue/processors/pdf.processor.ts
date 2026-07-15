import { Inject, Injectable, Optional } from '@nestjs/common';
import { PdfJobPayload, QUEUE_NAMES } from '@logo-platform/shared';
import { PDF_JOB_HANDLER, PdfJobHandler } from '../queue.constants';
import { QueueCancellationService } from '../queue-cancellation.service';
import { BaseQueueProcessor } from './base.processor';

@Injectable()
export class PdfProcessor extends BaseQueueProcessor<PdfJobPayload> {
  constructor(
    cancellation: QueueCancellationService,
    @Optional()
    @Inject(PDF_JOB_HANDLER)
    handler?: PdfJobHandler,
  ) {
    super(QUEUE_NAMES.pdf, handler, cancellation);
  }
}

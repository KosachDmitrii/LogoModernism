import { Inject, Injectable, Optional } from '@nestjs/common';
import { ImageJobPayload, QUEUE_NAMES } from '@logo-platform/shared';
import { IMAGE_JOB_HANDLER, ImageJobHandler } from '../queue.constants';
import { QueueCancellationService } from '../queue-cancellation.service';
import { BaseQueueProcessor } from './base.processor';

@Injectable()
export class ImageProcessor extends BaseQueueProcessor<ImageJobPayload> {
  constructor(
    cancellation: QueueCancellationService,
    @Optional()
    @Inject(IMAGE_JOB_HANDLER)
    handler?: ImageJobHandler,
  ) {
    super(QUEUE_NAMES.image, handler, cancellation);
  }
}

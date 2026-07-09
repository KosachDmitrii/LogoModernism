import { IsIn } from 'class-validator';

export class PromptFeedbackDto {
  @IsIn(['LIKE', 'DISLIKE'])
  signalType!: 'LIKE' | 'DISLIKE';
}

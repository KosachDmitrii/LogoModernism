import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { LOGO_RATING_EMOJIS } from '@logo-platform/shared';

const VALID_SCORES = LOGO_RATING_EMOJIS.map((r) => r.score);

export class LogoFeedbackDto {
  @IsInt()
  @Min(2)
  @Max(10)
  @IsIn(VALID_SCORES)
  score!: number;

  @IsString()
  emoji!: string;
}

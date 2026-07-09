import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LOGO_MISSED_TAGS, LOGO_RATING_EMOJIS, LOGO_WORKED_TAGS } from '@logo-platform/shared';

const VALID_SCORES = LOGO_RATING_EMOJIS.map((r) => r.score);

export class LogoFeedbackDto {
  @IsInt()
  @Min(2)
  @Max(10)
  @IsIn(VALID_SCORES)
  score!: number;

  @IsString()
  emoji!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workedTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missedTags?: string[];
}

export { LOGO_WORKED_TAGS, LOGO_MISSED_TAGS };

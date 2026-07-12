import { IsArray, IsOptional, IsString } from 'class-validator';

export class LogoTagsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workedTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missedTags?: string[];
}

import { IsBoolean } from 'class-validator';

export class PromptSaveDto {
  @IsBoolean()
  saved!: boolean;
}

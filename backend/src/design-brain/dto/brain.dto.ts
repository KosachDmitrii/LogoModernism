import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import type { BrainSourceType, TasteSignalType } from '@logo-platform/shared';

export class BriefContextDto {
  @IsOptional()
  @IsString()
  personality?: string;

  @IsOptional()
  @IsString()
  primaryEmotion?: string;

  @IsOptional()
  @IsString()
  complexity?: string;

  @IsOptional()
  @IsString()
  narrative?: string;

  @IsOptional()
  @IsString()
  typography?: string;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsOptional()
  @IsString()
  constraints?: string;

  @IsOptional()
  @IsString()
  geometry?: string;

  @IsOptional()
  @IsString()
  construction?: string;

  @IsOptional()
  @IsString()
  preferredShapes?: string;

  @IsOptional()
  @IsIn(['auto', 'black_white', 'monochrome', 'two_color', 'multi_color', 'corporate_blue', 'red_accent', 'limited', 'custom'])
  colorPalette?:
    | 'auto'
    | 'black_white'
    | 'monochrome'
    | 'two_color'
    | 'multi_color'
    | 'corporate_blue'
    | 'red_accent'
    | 'limited'
    | 'custom';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colorSelections?: string[];

  @IsOptional()
  @IsBoolean()
  allowShadows?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPhotoreal?: boolean;

  @IsOptional()
  @IsString()
  clientNotes?: string;

  @IsOptional()
  @IsString()
  knowledgeInsights?: string;

  @IsOptional()
  @IsString()
  bestPromptHint?: string;

  @IsOptional()
  @IsString()
  critiqueNote?: string;
}

export class BrainFeedbackDto {
  @IsIn(['LIKE', 'DISLIKE', 'APPROVE', 'REJECT', 'RATING'])
  signalType!: TasteSignalType;

  @IsNumber()
  @Min(-10)
  @Max(10)
  score!: number;

  @IsString()
  context!: string;

  @IsOptional()
  @IsString()
  experienceId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BrainPdfIngestCheckDto {
  @IsString()
  title!: string;

  @IsString()
  contentHash!: string;
}

export class BrainResearchRunDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(35)
  maxSources?: number;
}

export class BrainResearchPreviewDto {
  @IsString()
  query!: string;

  @IsUrl({ require_protocol: true })
  url!: string;
}

export class BrainResearchRejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BrainBriefInterviewDto {
  @IsString()
  industry!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsIn(['wordmark', 'lettermark', 'combination'])
  markType?: 'wordmark' | 'lettermark' | 'combination';

  @IsOptional()
  briefContext?: BriefContextDto;
}

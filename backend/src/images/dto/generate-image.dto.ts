import { IsArray, IsBoolean, IsString, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import type { ImageProvider, ImageSize } from '@logo-platform/shared';

export class GenerateImageDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsIn(['openai', 'mock'])
  provider?: ImageProvider;

  @IsOptional()
  @IsIn(['1024x1024', '1024x1792', '1792x1024'])
  size?: ImageSize;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  count?: number;
}

export class GenerateFromComposedPromptDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsIn(['openai', 'mock'])
  provider?: ImageProvider;

  @IsOptional()
  @IsIn(['wordmark', 'lettermark', 'combination'])
  markType?: 'wordmark' | 'lettermark' | 'combination';

  @IsOptional()
  @IsIn(['standard', 'constructed', 'modified_glyph', 'rebus', 'monogram_ligature'])
  typographyStyle?: 'standard' | 'constructed' | 'modified_glyph' | 'rebus' | 'monogram_ligature';

  @IsOptional()
  @IsIn(['1024x1024', '1024x1792', '1792x1024'])
  size?: ImageSize;

  @IsOptional()
  @IsIn([
    'auto',
    'black_white',
    'monochrome',
    'two_color',
    'multi_color',
    'corporate_blue',
    'red_accent',
    'limited',
    'custom',
  ])
  colorPalette?: string;

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
}

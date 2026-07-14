import { IsOptional, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import type { ImageProvider } from '@logo-platform/shared';

function emptyToUndefined({ value }: { value: unknown }) {
  return value === '' || value === null ? undefined : value;
}

export class GeneratePromptLogoDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  companyName?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['wordmark', 'lettermark', 'combination'])
  markType?: 'wordmark' | 'lettermark' | 'combination';

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['standard', 'constructed', 'modified_glyph', 'rebus', 'monogram_ligature'])
  typographyStyle?: 'standard' | 'constructed' | 'modified_glyph' | 'rebus' | 'monogram_ligature';

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['openai', 'mock'])
  provider?: ImageProvider;
}

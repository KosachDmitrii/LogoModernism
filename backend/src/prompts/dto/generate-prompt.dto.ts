import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PROMPT_GENERATE_INTENTS } from '@logo-platform/shared';
import { BriefContextDto } from '../../design-brain/dto/brain.dto';

export class GeneratePromptDto {
  @IsString()
  @MaxLength(120)
  industry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  variationCount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['swiss', 'bauhaus', 'ibm', 'nasa', 'lufthansa', 'braun', 'cbs', 'abc', 'olivetti', 'westinghouse'])
  inspirationMode?: string;

  @IsOptional()
  @IsString()
  preferredEra?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minimalismLevel?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  analysisPrincipleIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  catalogReferenceIds?: string[];

  @IsOptional()
  @IsBoolean()
  autoCatalogReferences?: boolean;

  @IsOptional()
  @IsBoolean()
  rebusWordmark?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  catalogNarrative?: string;

  @IsOptional()
  @IsIn(['wordmark', 'lettermark', 'combination'])
  markType?: 'wordmark' | 'lettermark' | 'combination';

  @IsOptional()
  @IsIn(['standard', 'constructed', 'modified_glyph', 'rebus', 'monogram_ligature'])
  typographyStyle?: 'standard' | 'constructed' | 'modified_glyph' | 'rebus' | 'monogram_ligature';

  @IsOptional()
  @ValidateNested()
  @Type(() => BriefContextDto)
  briefContext?: BriefContextDto;

  @IsOptional()
  @IsBoolean()
  useBrain?: boolean;

  @IsOptional()
  @IsIn(['territory-primary', 'territory-construction', 'territory-typography'])
  preferredTerritoryId?: 'territory-primary' | 'territory-construction' | 'territory-typography';

  @IsOptional()
  @IsIn([...PROMPT_GENERATE_INTENTS])
  intent?: (typeof PROMPT_GENERATE_INTENTS)[number];
}

export class SearchPrinciplesDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  era?: string;
}

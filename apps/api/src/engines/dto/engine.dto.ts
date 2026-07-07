import { IsString, IsOptional, IsNumber, IsArray, IsIn, Min, Max } from 'class-validator';

export class BrandDNARequestDto {
  @IsString()
  companyName!: string;

  @IsString()
  industry!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsIn(['bold', 'refined', 'playful', 'technical', 'luxurious', 'approachable'])
  personality?: 'bold' | 'refined' | 'playful' | 'technical' | 'luxurious' | 'approachable';
}

export class LetterDNARequestDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsIn(['geometric', 'humanist', 'grotesque', 'monoline', 'custom'])
  style?: 'geometric' | 'humanist' | 'grotesque' | 'monoline' | 'custom';
}

export class GeometryRequestDto {
  @IsString()
  industry!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredShapes?: string[];

  @IsOptional()
  @IsIn(['minimal', 'medium', 'high'])
  complexity?: 'minimal' | 'medium' | 'high';
}

export class ReverseAnalysisRequestDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observedShapes?: string[];

  @IsOptional()
  @IsNumber()
  observedColors?: number;
}

export class FullPipelineRequestDto {
  @IsString()
  companyName!: string;

  @IsString()
  industry!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  variationCount?: number;

  @IsOptional()
  @IsIn(['symbol', 'wordmark', 'combination', 'emblem'])
  markType?: 'symbol' | 'wordmark' | 'combination' | 'emblem';
}

export class SVGBlueprintRequestDto {
  @IsArray()
  @IsString({ each: true })
  primitiveIds!: string[];
}

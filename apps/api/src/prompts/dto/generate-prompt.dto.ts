import { IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GeneratePromptDto {
  @IsString()
  industry!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
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
  @IsString({ each: true })
  analysisPrincipleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  catalogReferenceIds?: string[];

  @IsOptional()
  @IsString()
  catalogNarrative?: string;

  @IsOptional()
  @IsIn(['wordmark', 'lettermark', 'combination'])
  markType?: 'wordmark' | 'lettermark' | 'combination';

  @IsOptional()
  @IsIn(['standard', 'constructed'])
  typographyStyle?: 'standard' | 'constructed';
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

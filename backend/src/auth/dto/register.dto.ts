import { IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  organizationName?: string;
}

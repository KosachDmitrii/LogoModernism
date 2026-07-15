import { IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsString()
  @Length(2, 100)
  organizationName!: string;
}

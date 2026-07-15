import { IsIn } from 'class-validator';
import type { Plan } from '@logo-platform/shared';

export class CheckoutDto {
  @IsIn(['PRO'])
  plan!: Plan;
}

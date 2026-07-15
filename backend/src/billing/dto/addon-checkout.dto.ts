import { IsIn } from 'class-validator';
import type { LogoAddonPack } from '@logo-platform/shared';

export class AddonCheckoutDto {
  @IsIn(['LOGOS_10', 'LOGOS_25'])
  pack!: LogoAddonPack;
}

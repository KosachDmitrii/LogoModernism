import { SetMetadata } from '@nestjs/common';
import type { PlatformRole } from '@logo-platform/shared';

export const REQUIRED_PLATFORM_ROLES = 'requiredPlatformRoles';

export const PlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(REQUIRED_PLATFORM_ROLES, roles);

export const PLATFORM_ADMINS: PlatformRole[] = ['PLATFORM_ADMIN'];

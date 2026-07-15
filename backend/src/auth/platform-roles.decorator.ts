import { SetMetadata } from '@nestjs/common';
import type { AccessRole } from '@logo-platform/shared';

export const REQUIRED_ACCESS_ROLES = 'requiredAccessRoles';

export const AccessRoles = (...roles: AccessRole[]) =>
  SetMetadata(REQUIRED_ACCESS_ROLES, roles);

export const ADMINS: AccessRole[] = ['ADMIN'];

import { applyDecorators, SetMetadata } from '@nestjs/common';
import { AccessRoles } from './platform-roles.decorator';

export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export const REQUIRED_ROLES = 'requiredTenantRoles';
export const Roles = (...roles: TenantRole[]) => SetMetadata(REQUIRED_ROLES, roles);

export const ALL_MEMBERS: TenantRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
export const CONTRIBUTORS: TenantRole[] = ['OWNER', 'ADMIN', 'MEMBER'];
export const BRAIN_ADMINS: TenantRole[] = ['OWNER', 'ADMIN'];

export const BrainAdmin = () =>
  applyDecorators(Roles(...BRAIN_ADMINS), AccessRoles('ADMIN'));

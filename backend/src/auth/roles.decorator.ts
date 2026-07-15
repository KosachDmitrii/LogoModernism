import { SetMetadata } from '@nestjs/common';

export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export const REQUIRED_ROLES = 'requiredTenantRoles';
export const Roles = (...roles: TenantRole[]) => SetMetadata(REQUIRED_ROLES, roles);

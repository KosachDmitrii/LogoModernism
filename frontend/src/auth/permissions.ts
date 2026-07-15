export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type Permission =
  | 'catalog.read'
  | 'brain.read'
  | 'product.use'
  | 'brain.manage';

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<Permission>> = {
  VIEWER: new Set(['catalog.read', 'brain.read']),
  MEMBER: new Set(['catalog.read', 'brain.read', 'product.use']),
  ADMIN: new Set(['catalog.read', 'brain.read', 'product.use', 'brain.manage']),
  OWNER: new Set(['catalog.read', 'brain.read', 'product.use', 'brain.manage']),
};

export function hasPermission(
  role: TenantRole | null | undefined,
  permission: Permission,
  platformRole: 'USER' | 'PLATFORM_ADMIN' = 'USER',
): boolean {
  if (permission === 'brain.manage') {
    return platformRole === 'PLATFORM_ADMIN' && (role === 'OWNER' || role === 'ADMIN');
  }
  return role ? ROLE_PERMISSIONS[role].has(permission) : false;
}

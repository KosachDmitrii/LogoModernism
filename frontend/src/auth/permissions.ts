export type AccessRole = 'ADMIN' | 'USER' | 'GUEST';

export type Permission =
  | 'catalog.read'
  | 'brain.read'
  | 'product.use'
  | 'brain.manage';

const ROLE_PERMISSIONS: Record<AccessRole, ReadonlySet<Permission>> = {
  GUEST: new Set(['catalog.read', 'brain.read']),
  USER: new Set(['catalog.read', 'brain.read', 'product.use']),
  ADMIN: new Set(['catalog.read', 'brain.read', 'product.use', 'brain.manage']),
};

export function hasPermission(
  role: AccessRole | null | undefined,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role ?? 'GUEST'].has(permission);
}

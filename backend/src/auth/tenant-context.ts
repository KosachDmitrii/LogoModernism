import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PlatformRole } from '@logo-platform/shared';
import type { Request } from 'express';

export type TenantScope = {
  userId: string;
  organizationId: string;
  projectId?: string;
};

export type AuthIdentity = {
  userId: string;
  email?: string;
  platformRole?: PlatformRole;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthIdentity;
  tenant?: TenantScope;
  requestId?: string;
};

export const AuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthIdentity | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);

export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantScope | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().tenant,
);

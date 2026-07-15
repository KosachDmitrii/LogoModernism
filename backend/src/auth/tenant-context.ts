import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type TenantScope = {
  userId: string;
  organizationId: string;
  projectId?: string;
};

export type AuthIdentity = {
  userId: string;
  email?: string;
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

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type TenantScope = {
  userId: string;
  organizationId: string;
  projectId?: string;
};

export type AuthenticatedRequest = Request & {
  tenant?: TenantScope;
  requestId?: string;
};

export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantScope | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().tenant,
);

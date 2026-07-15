import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { db } from '@logo-platform/database';
import type { AccessRole } from '@logo-platform/shared';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import { AUTHENTICATED_ONLY_ROUTE } from './authenticated.decorator';
import type { AuthenticatedRequest } from './tenant-context';
import { REQUIRED_ACCESS_ROLES } from './platform-roles.decorator';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  private readonly jwks = process.env.AUTH_JWKS_URL
    ? createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL))
    : null;

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authenticatedOnly = this.reflector.getAllAndOverride<boolean>(
      AUTHENTICATED_ONLY_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (!this.jwks) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('AUTH_JWKS_URL is not configured');
      }
      this.attachDevelopmentScope(request);
      if (!request.auth) {
        throw new UnauthorizedException('x-user-id is required in development');
      }
      if (authenticatedOnly) return true;
      if (!request.tenant) {
        throw new UnauthorizedException('Development user scope is required');
      }
      const accessRole =
        (this.readHeader(request, 'x-access-role', false)?.toUpperCase() as
          | AccessRole
          | undefined) ?? 'USER';
      request.auth.accessRole = accessRole;
      request.tenant.accessRole = accessRole;
      this.assertAccessRoleAllowed(accessRole, context);
      return true;
    }

    this.assertProductionJwtConfiguration();
    const token = this.readBearerToken(request.headers.authorization);
    const { payload } = await this.verifyToken(token);
    const userId = payload.sub;
    if (!userId) throw new UnauthorizedException('JWT subject is required');
    request.auth = {
      userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
    if (authenticatedOnly) return true;

    const projectId = this.readHeader(request, 'x-project-id', false);
    const account = await db.maybeOne<{
      accessRole: AccessRole;
      organizationId: string | null;
    }>(
      `SELECT u.access_role,
              (SELECT om.organization_id
               FROM organization_members om
               WHERE om.user_id = u.id
               ORDER BY om.created_at ASC LIMIT 1) AS organization_id
       FROM users u
       WHERE u.id = $1`,
      [userId],
    );
    if (!account) throw new UnauthorizedException('User account is required');
    if (!account.organizationId) {
      throw new UnauthorizedException('User data scope has not been provisioned');
    }
    request.auth.accessRole = account.accessRole;
    this.assertAccessRoleAllowed(account.accessRole, context);

    if (projectId) {
      const project = await db.maybeOne<{ id: string }>(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId],
      );
      if (!project) throw new UnauthorizedException('Project does not belong to user');
    }

    request.tenant = {
      userId,
      organizationId: account.organizationId,
      projectId,
      accessRole: account.accessRole,
    };
    return true;
  }

  private assertProductionJwtConfiguration(): void {
    if (process.env.NODE_ENV !== 'production') return;
    const missing = ['AUTH_ISSUER', 'AUTH_AUDIENCE'].filter(
      (name) => !process.env[name]?.trim(),
    );
    if (missing.length) {
      throw new ServiceUnavailableException(`${missing.join(', ')} must be configured`);
    }
  }

  private assertAccessRoleAllowed(role: AccessRole, context: ExecutionContext): void {
    const metadata = this.reflector.getAllAndOverride<AccessRole[]>(
      REQUIRED_ACCESS_ROLES,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles = Array.isArray(metadata) ? metadata : [];
    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new ForbiddenException('Access role is not permitted');
    }
  }

  private async verifyToken(token: string): Promise<{ payload: JWTPayload }> {
    try {
      return await jwtVerify(token, this.jwks!, {
        issuer: process.env.AUTH_ISSUER,
        audience: process.env.AUTH_AUDIENCE,
      });
    } catch (error) {
      const detail =
        error && typeof error === 'object'
          ? {
              code: 'code' in error ? String(error.code) : undefined,
              message: 'message' in error ? String(error.message) : 'JWT verification failed',
            }
          : { message: 'JWT verification failed' };
      console.warn('[auth] JWT verification failed', detail);
      throw new UnauthorizedException('Invalid or expired bearer token');
    }
  }

  private readBearerToken(value?: string): string {
    const [scheme, token] = value?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Bearer token is required');
    }
    return token;
  }

  private readHeader(
    request: AuthenticatedRequest,
    name: string,
    required = true,
  ): string | undefined {
    const value = request.headers[name];
    const result = Array.isArray(value) ? value[0] : value;
    if (required && !result) throw new UnauthorizedException(`${name} is required`);
    return result;
  }

  private attachDevelopmentScope(request: AuthenticatedRequest): void {
    const userId = this.readHeader(request, 'x-user-id', false);
    const organizationId = this.readHeader(request, 'x-organization-id', false);
    if (!userId) return;
    request.auth = { userId };
    if (!organizationId) return;
    request.tenant = {
      userId,
      organizationId,
      projectId: this.readHeader(request, 'x-project-id', false),
      accessRole: 'USER',
    };
  }
}

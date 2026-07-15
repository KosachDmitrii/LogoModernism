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
import { prisma } from '@logo-platform/database';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import type { AuthenticatedRequest } from './tenant-context';
import { REQUIRED_ROLES, type TenantRole } from './roles.decorator';

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
    if (!this.jwks) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('AUTH_JWKS_URL is not configured');
      }
      this.attachDevelopmentScope(request);
      return true;
    }

    const token = this.readBearerToken(request.headers.authorization);
    const { payload } = await this.verifyToken(token);
    const userId = payload.sub;
    const organizationId = this.readHeader(request, 'x-organization-id');
    const projectId = this.readHeader(request, 'x-project-id', false);
    if (!userId || !organizationId) {
      throw new UnauthorizedException('User and organization context are required');
    }

    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new UnauthorizedException('Organization membership is required');
    const requiredRoles =
      this.reflector.getAllAndOverride<TenantRole[]>(REQUIRED_ROLES, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (requiredRoles.length && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Organization role is not permitted');
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId },
        select: { id: true },
      });
      if (!project) throw new UnauthorizedException('Project does not belong to organization');
    }

    request.tenant = { userId, organizationId, projectId };
    return true;
  }

  private async verifyToken(token: string): Promise<{ payload: JWTPayload }> {
    try {
      return await jwtVerify(token, this.jwks!, {
        issuer: process.env.AUTH_ISSUER,
        audience: process.env.AUTH_AUDIENCE,
      });
    } catch {
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
    if (!userId || !organizationId) return;
    request.tenant = {
      userId,
      organizationId,
      projectId: this.readHeader(request, 'x-project-id', false),
    };
  }
}

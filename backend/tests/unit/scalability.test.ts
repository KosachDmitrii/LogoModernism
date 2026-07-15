import { describe, expect, it } from 'vitest';
import { isPostgreSqlPoolTimeout } from '../../src/common/postgresql-pool-timeout.filter';
import { TenantAuthGuard } from '../../src/auth/tenant-auth.guard';
import { AUTHENTICATED_ONLY_ROUTE } from '../../src/auth/authenticated.decorator';
import { REQUIRED_ACCESS_ROLES } from '../../src/auth/platform-roles.decorator';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { NightlyBrainSchedulerService } from '../../src/design-brain/nightly-brain-scheduler.service';

function authContext(headers: Record<string, string>) {
  const request = { headers };
  const context = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

describe('scalability guardrails', () => {
  it('activates the PostgreSQL-backed nightly scheduler', () => {
    const previousEnabled = process.env.BRAIN_NIGHTLY_RESEARCH;
    const previousHour = process.env.BRAIN_NIGHTLY_RESEARCH_HOUR_UTC;
    const scheduler = new NightlyBrainSchedulerService({
      create: async () => ({ id: 'nightly-task' }),
    } as never);
    try {
      process.env.BRAIN_NIGHTLY_RESEARCH = 'true';
      process.env.BRAIN_NIGHTLY_RESEARCH_HOUR_UTC = String(
        (new Date().getUTCHours() + 1) % 24,
      );
      scheduler.onModuleInit();
      expect(scheduler.isActive()).toBe(true);
    } finally {
      scheduler.onModuleDestroy();
      if (previousEnabled === undefined) delete process.env.BRAIN_NIGHTLY_RESEARCH;
      else process.env.BRAIN_NIGHTLY_RESEARCH = previousEnabled;
      if (previousHour === undefined) delete process.env.BRAIN_NIGHTLY_RESEARCH_HOUR_UTC;
      else process.env.BRAIN_NIGHTLY_RESEARCH_HOUR_UTC = previousHour;
    }
  });

  it.each(['53300', '57P03', 'ETIMEDOUT'])(
    'maps PostgreSQL %s saturation to bounded 503 handling',
    (code) => {
      expect(isPostgreSqlPoolTimeout({ code })).toBe(true);
    },
  );

  it('attaches an explicit development tenant scope', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwks = process.env.AUTH_JWKS_URL;
    process.env.NODE_ENV = 'test';
    delete process.env.AUTH_JWKS_URL;
    try {
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { request, context } = authContext({
        'x-user-id': 'user-1',
        'x-organization-id': 'org-1',
        'x-project-id': 'project-1',
      });
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request).toMatchObject({
        tenant: {
          userId: 'user-1',
          organizationId: 'org-1',
          projectId: 'project-1',
        },
      });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.AUTH_JWKS_URL = previousJwks;
    }
  });

  it('denies User access to admin operations in development', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwks = process.env.AUTH_JWKS_URL;
    process.env.NODE_ENV = 'test';
    delete process.env.AUTH_JWKS_URL;
    try {
      const reflector = {
        getAllAndOverride: (key: string) =>
          key === REQUIRED_ACCESS_ROLES ? ['ADMIN'] : false,
      } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { context } = authContext({
        'x-user-id': 'user-a',
        'x-organization-id': 'org-a',
        'x-access-role': 'USER',
      });
      await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403 });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.AUTH_JWKS_URL = previousJwks;
    }
  });

  it('allows Admin access to Brain admin operations in development', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwks = process.env.AUTH_JWKS_URL;
    process.env.NODE_ENV = 'test';
    delete process.env.AUTH_JWKS_URL;
    try {
      const reflector = {
        getAllAndOverride: (key: string) =>
          key === REQUIRED_ACCESS_ROLES ? ['ADMIN'] : false,
      } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { context } = authContext({
        'x-user-id': 'admin-b',
        'x-organization-id': 'org-b',
        'x-access-role': 'ADMIN',
      });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.AUTH_JWKS_URL = previousJwks;
    }
  });

  it('fails closed when production JWT verification is not configured', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwks = process.env.AUTH_JWKS_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_JWKS_URL;
    try {
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { context } = authContext({});
      await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 503 });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.AUTH_JWKS_URL = previousJwks;
    }
  });

  it('allows development auth-only routes without an organization', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwks = process.env.AUTH_JWKS_URL;
    process.env.NODE_ENV = 'test';
    delete process.env.AUTH_JWKS_URL;
    try {
      const reflector = {
        getAllAndOverride: (key: string) => key === AUTHENTICATED_ONLY_ROUTE,
      } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { request, context } = authContext({ 'x-user-id': 'user-1' });
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request).toMatchObject({ auth: { userId: 'user-1' } });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.AUTH_JWKS_URL = previousJwks;
    }
  });

  it('requires issuer and audience with production JWKS verification', async () => {
    const previous = {
      nodeEnv: process.env.NODE_ENV,
      jwks: process.env.AUTH_JWKS_URL,
      issuer: process.env.AUTH_ISSUER,
      audience: process.env.AUTH_AUDIENCE,
    };
    process.env.NODE_ENV = 'production';
    process.env.AUTH_JWKS_URL = 'https://example.test/.well-known/jwks.json';
    delete process.env.AUTH_ISSUER;
    delete process.env.AUTH_AUDIENCE;
    try {
      const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { context } = authContext({});
      await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 503 });
    } finally {
      process.env.NODE_ENV = previous.nodeEnv;
      process.env.AUTH_JWKS_URL = previous.jwks;
      process.env.AUTH_ISSUER = previous.issuer;
      process.env.AUTH_AUDIENCE = previous.audience;
    }
  });
});

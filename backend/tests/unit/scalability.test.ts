import { describe, expect, it } from 'vitest';
import { getQueueConcurrency, getRedisConnectionOptions } from '../../src/queue/queue.config';
import { isPrismaPoolTimeout } from '../../src/common/prisma-pool-timeout.filter';
import { TenantAuthGuard } from '../../src/auth/tenant-auth.guard';
import { AUTHENTICATED_ONLY_ROUTE } from '../../src/auth/authenticated.decorator';
import { REQUIRED_ROLES } from '../../src/auth/roles.decorator';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

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
  it('uses bounded provider-specific worker concurrency', () => {
    expect(getQueueConcurrency('pdf')).toBe(1);
    expect(getQueueConcurrency('image')).toBe(2);
    expect(getQueueConcurrency('prompt')).toBe(2);
    expect(getQueueConcurrency('feedback')).toBe(5);
  });

  it('parses managed TLS Redis URLs without request retries', () => {
    const previous = process.env.REDIS_URL;
    process.env.REDIS_URL = 'rediss://user:secret@example.test:6380/2';
    try {
      const options = getRedisConnectionOptions();
      expect(options).toMatchObject({
        host: 'example.test',
        port: 6380,
        username: 'user',
        password: 'secret',
        db: 2,
        maxRetriesPerRequest: null,
        tls: {},
      });
    } finally {
      process.env.REDIS_URL = previous;
    }
  });

  it.each(['P1008', 'P2024'])('maps Prisma %s saturation to bounded 503 handling', (code) => {
    expect(isPrismaPoolTimeout({ code })).toBe(true);
  });

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

  it('denies Viewer access to contributor operations in development', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwks = process.env.AUTH_JWKS_URL;
    process.env.NODE_ENV = 'test';
    delete process.env.AUTH_JWKS_URL;
    try {
      const reflector = {
        getAllAndOverride: (key: string) =>
          key === REQUIRED_ROLES ? ['OWNER', 'ADMIN', 'MEMBER'] : false,
      } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { context } = authContext({
        'x-user-id': 'viewer-a',
        'x-organization-id': 'org-a',
        'x-role': 'VIEWER',
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
          key === REQUIRED_ROLES ? ['OWNER', 'ADMIN'] : false,
      } as unknown as Reflector;
      const guard = new TenantAuthGuard(reflector);
      const { context } = authContext({
        'x-user-id': 'admin-b',
        'x-organization-id': 'org-b',
        'x-role': 'ADMIN',
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

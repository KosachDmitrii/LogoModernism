import { describe, expect, it } from 'vitest';
import { getQueueConcurrency, getRedisConnectionOptions } from '../../src/queue/queue.config';
import { isPrismaPoolTimeout } from '../../src/common/prisma-pool-timeout.filter';
import { TenantAuthGuard } from '../../src/auth/tenant-auth.guard';
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
});

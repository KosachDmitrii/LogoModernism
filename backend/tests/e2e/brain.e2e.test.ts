import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request, { type Test } from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app';
import { getTestDatabase, isE2eDbReady, resetBrainTables } from '../helpers/db';
import type { DatabaseClient } from '@logo-platform/database';

const describeE2e = isE2eDbReady() ? describe : describe.skip;

describeE2e('Brain API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseClient;
  const fixtureId = `brain-e2e-${Date.now().toString(36)}`;
  const userId = `${fixtureId}-user`;
  const organizationId = `${fixtureId}-org`;

  function authenticated(test: Test, platformAdmin = false): Test {
    const withTenant = test
      .set('x-user-id', userId)
      .set('x-organization-id', organizationId);
    return platformAdmin
      ? withTenant.set('x-platform-role', 'PLATFORM_ADMIN')
      : withTenant;
  }

  beforeAll(async () => {
    database = await getTestDatabase();
    await database.query(
      `INSERT INTO users (id, email, platform_role, updated_at)
       VALUES ($1, $2, 'PLATFORM_ADMIN'::"PlatformRole", NOW())`,
      [userId, `${userId}@example.test`],
    );
    await database.query(
      `INSERT INTO organizations (id, name, slug, updated_at)
       VALUES ($1, 'Brain E2E', $1, NOW())`,
      [organizationId],
    );
    await database.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role)
       VALUES ($1, $2, $3, 'OWNER'::"Role")`,
      [`${fixtureId}-membership`, organizationId, userId],
    );
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await database.query('DELETE FROM organizations WHERE id = $1', [organizationId])
      .catch(() => undefined);
    await database.query('DELETE FROM users WHERE id = $1', [userId])
      .catch(() => undefined);
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('GET /api/health responds ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/brain/health returns capabilities', async () => {
    const res = await authenticated(
      request(app.getHttpServer()).get('/api/brain/health'),
      true,
    ).expect(200);

    expect(res.body.databaseConfigured).toBe(true);
    expect(res.body.embeddingConfigured).toBe(true);
    expect(Array.isArray(res.body.trustedDomains)).toBe(true);
  });

  it('GET /api/brain/stats returns brain counters', async () => {
    const res = await authenticated(
      request(app.getHttpServer()).get('/api/brain/stats'),
    ).expect(200);

    expect(res.body).toMatchObject({
      experiences: expect.any(Number),
      tasteSignals: expect.any(Number),
      learnedPrinciples: expect.any(Number),
      pgvectorEnabled: true,
      embeddingDimensions: 1536,
    });
  });

  it('GET /api/brain/taste-profile returns defaults on empty brain', async () => {
    const res = await authenticated(
      request(app.getHttpServer()).get('/api/brain/taste-profile'),
    ).expect(200);

    expect(res.body.signalCount).toBe(0);
    expect(res.body.preferredMarkTypes).toContain('wordmark');
  });

  it('POST /api/brain/ingest/feedback → consolidate → principles flow', async () => {
    await authenticated(
      request(app.getHttpServer()).post('/api/brain/ingest/feedback'),
    )
      .send({
        signalType: 'LIKE',
        score: 9,
        context: 'Excellent geometric wordmark with grid-based flat vector construction',
        metadata: { workedTags: ['geometry', 'typography'] },
      })
      .expect(202);

    const statsAfterFeedback = await authenticated(
      request(app.getHttpServer()).get('/api/brain/stats'),
    ).expect(200);
    expect(statsAfterFeedback.body.tasteSignals).toBeGreaterThanOrEqual(1);
    expect(statsAfterFeedback.body.experiences).toBeGreaterThanOrEqual(1);

    const consolidate = await authenticated(
      request(app.getHttpServer()).post('/api/brain/consolidate'),
      true,
    ).expect(202);
    expect(consolidate.body.ranAt).toBeTruthy();

    const taste = await authenticated(
      request(app.getHttpServer()).get('/api/brain/taste-profile'),
    ).expect(200);
    expect(taste.body.signalCount).toBeGreaterThanOrEqual(1);

    const principles = await authenticated(
      request(app.getHttpServer()).get('/api/brain/principles?limit=10'),
    ).expect(200);
    expect(Array.isArray(principles.body.items)).toBe(true);
    expect(typeof principles.body.total).toBe('number');
  });

  it('POST /api/brain/brief/interview returns interview questions', async () => {
    const res = await authenticated(
      request(app.getHttpServer()).post('/api/brain/brief/interview'),
    )
      .send({
        industry: 'fintech',
        companyName: 'NovaPay',
        markType: 'wordmark',
      })
      .expect(201);

    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);
    expect(res.body.clientIntent).toBeDefined();
    expect(typeof res.body.readinessScore).toBe('number');
  });

  it('POST /api/brain/ingest/feedback validates required fields', async () => {
    await authenticated(
      request(app.getHttpServer()).post('/api/brain/ingest/feedback'),
    )
      .send({ signalType: 'LIKE' })
      .expect(400);
  });

  it('GET /api/brain/experiences lists ingested records', async () => {
    await authenticated(
      request(app.getHttpServer()).post('/api/brain/ingest/feedback'),
    )
      .send({
        signalType: 'APPROVE',
        score: 8,
        context: 'Clean lettermark with Swiss grid construction',
      })
      .expect(202);

    const res = await authenticated(
      request(app.getHttpServer()).get('/api/brain/experiences?limit=5'),
      true,
    ).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

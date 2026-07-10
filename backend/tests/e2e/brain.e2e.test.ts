import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app';
import { createTestPrisma, isE2eDbReady, resetBrainTables } from '../helpers/db';

const describeE2e = isE2eDbReady() ? describe : describe.skip;

describeE2e('Brain API (e2e)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createTestPrisma>;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = createTestPrisma();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await resetBrainTables(prisma);
  });

  it('GET /api/health responds ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/brain/health returns capabilities', async () => {
    const res = await request(app.getHttpServer()).get('/api/brain/health').expect(200);

    expect(res.body.databaseConfigured).toBe(true);
    expect(res.body.embeddingConfigured).toBe(true);
    expect(Array.isArray(res.body.trustedDomains)).toBe(true);
  });

  it('GET /api/brain/stats returns brain counters', async () => {
    const res = await request(app.getHttpServer()).get('/api/brain/stats').expect(200);

    expect(res.body).toMatchObject({
      experiences: expect.any(Number),
      tasteSignals: expect.any(Number),
      learnedPrinciples: expect.any(Number),
      pgvectorEnabled: true,
      embeddingDimensions: 1536,
    });
  });

  it('GET /api/brain/taste-profile returns defaults on empty brain', async () => {
    const res = await request(app.getHttpServer()).get('/api/brain/taste-profile').expect(200);

    expect(res.body.signalCount).toBe(0);
    expect(res.body.preferredMarkTypes).toContain('wordmark');
  });

  it('POST /api/brain/ingest/feedback → consolidate → principles flow', async () => {
    await request(app.getHttpServer())
      .post('/api/brain/ingest/feedback')
      .send({
        signalType: 'LIKE',
        score: 9,
        context: 'Excellent geometric wordmark with grid-based flat vector construction',
        metadata: { workedTags: ['geometry', 'typography'] },
      })
      .expect(201);

    const statsAfterFeedback = await request(app.getHttpServer()).get('/api/brain/stats').expect(200);
    expect(statsAfterFeedback.body.tasteSignals).toBeGreaterThanOrEqual(1);
    expect(statsAfterFeedback.body.experiences).toBeGreaterThanOrEqual(1);

    const consolidate = await request(app.getHttpServer()).post('/api/brain/consolidate').expect(201);
    expect(consolidate.body.ranAt).toBeTruthy();

    const taste = await request(app.getHttpServer()).get('/api/brain/taste-profile').expect(200);
    expect(taste.body.signalCount).toBeGreaterThanOrEqual(1);

    const principles = await request(app.getHttpServer()).get('/api/brain/principles?limit=10').expect(200);
    expect(Array.isArray(principles.body)).toBe(true);
  });

  it('POST /api/brain/brief/interview returns interview questions', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/brain/brief/interview')
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
    await request(app.getHttpServer())
      .post('/api/brain/ingest/feedback')
      .send({ signalType: 'LIKE' })
      .expect(400);
  });

  it('GET /api/brain/experiences lists ingested records', async () => {
    await request(app.getHttpServer())
      .post('/api/brain/ingest/feedback')
      .send({
        signalType: 'APPROVE',
        score: 8,
        context: 'Clean lettermark with Swiss grid construction',
      })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/api/brain/experiences?limit=5').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

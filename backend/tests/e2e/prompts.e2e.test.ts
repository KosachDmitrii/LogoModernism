import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app';
import { isE2eDbReady } from '../helpers/db';

const describeE2e = isE2eDbReady() ? describe : describe.skip;

describeE2e('Prompts API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/prompts/generate with useBrain returns brainPowered pipeline', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/prompts/generate')
      .send({
        industry: 'fintech',
        companyName: 'NovaPay',
        variationCount: 2,
        markType: 'wordmark',
        minimalismLevel: 8,
        useBrain: true,
        briefContext: {
          personality: 'trustworthy, precise',
          geometry: 'grid-based circles',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
        },
      })
      .expect(201);

    expect(res.body.brainPowered).toBe(true);
    expect(Array.isArray(res.body.prompts)).toBe(true);
    expect(res.body.prompts.length).toBe(2);
    expect(res.body.bestPrompt?.text?.length).toBeGreaterThan(50);
    expect(res.body.decision).toBeDefined();
    expect(res.body.tasteProfile).toBeDefined();
    expect(Array.isArray(res.body.retrievedExperiences)).toBe(true);
  });

  it('POST /api/prompts/generate validates industry', async () => {
    await request(app.getHttpServer())
      .post('/api/prompts/generate')
      .send({ companyName: 'NovaPay' })
      .expect(400);
  });

  it('GET /api/prompts/recommend/:industry returns suggestions', async () => {
    const res = await request(app.getHttpServer()).get('/api/prompts/recommend/fintech').expect(200);

    expect(res.body.industry).toBe('fintech');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });
});

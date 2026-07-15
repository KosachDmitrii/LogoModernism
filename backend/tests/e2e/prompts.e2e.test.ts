import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app';
import { isE2eDbReady } from '../helpers/db';
import { prisma } from '@logo-platform/database';

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
      .expect(202);

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

  it('isolates saved prompts by organization', async () => {
    const suffix = Date.now().toString(36);
    const organizationA = `org-a-${suffix}`;
    const organizationB = `org-b-${suffix}`;
    const promptA = `prompt-a-${suffix}`;
    const promptB = `prompt-b-${suffix}`;
    await prisma.organization.createMany({
      data: [
        { id: organizationA, name: 'Tenant A', slug: organizationA },
        { id: organizationB, name: 'Tenant B', slug: organizationB },
      ],
    });
    await prisma.composedPromptRecord.createMany({
      data: [organizationA, organizationB].map((organizationId, index) => ({
        id: index === 0 ? promptA : promptB,
        organizationId,
        industry: 'technology',
        text: `Tenant prompt ${index}`,
        scores: {},
        dna: {},
        metadata: {},
        selectedPrinciples: [],
        logos: [],
        saved: true,
        savedAt: new Date(),
      })),
    });

    try {
      const response = await request(app.getHttpServer())
        .get('/api/prompts/saved')
        .set('x-user-id', 'test-user')
        .set('x-organization-id', organizationA)
        .expect(200);
      expect(response.body.prompts.map((prompt: { id: string }) => prompt.id)).toContain(promptA);
      expect(response.body.prompts.map((prompt: { id: string }) => prompt.id)).not.toContain(
        promptB,
      );
    } finally {
      await prisma.composedPromptRecord.deleteMany({
        where: { id: { in: [promptA, promptB] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [organizationA, organizationB] } },
      });
    }
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app';
import { isE2eDbReady } from '../helpers/db';
import { db } from '@logo-platform/database';

const describeE2e = isE2eDbReady() ? describe : describe.skip;

describeE2e('Prompts API (e2e)', () => {
  let app: INestApplication;
  const fixtureId = `prompts-e2e-${Date.now().toString(36)}`;
  const userId = `${fixtureId}-user`;
  const organizationId = `${fixtureId}-org`;

  beforeAll(async () => {
    await db.query(
      'INSERT INTO users (id, email, updated_at) VALUES ($1, $2, NOW())',
      [userId, `${userId}@example.test`],
    );
    await db.query(
      `INSERT INTO organizations (id, name, slug, updated_at)
       VALUES ($1, 'Prompts E2E', $1, NOW())`,
      [organizationId],
    );
    await db.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role)
       VALUES ($1, $2, $3, 'OWNER'::"Role")`,
      [`${fixtureId}-membership`, organizationId, userId],
    );
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await db.query('DELETE FROM organizations WHERE id = $1', [organizationId])
      .catch(() => undefined);
    await db.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  });

  it('POST /api/prompts/generate with useBrain returns brainPowered pipeline', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/prompts/generate')
      .set('x-user-id', userId)
      .set('x-organization-id', organizationId)
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
      .set('x-user-id', userId)
      .set('x-organization-id', organizationId)
      .send({ companyName: 'NovaPay' })
      .expect(400);
  });

  it('GET /api/prompts/recommend/:industry returns suggestions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/prompts/recommend/fintech')
      .set('x-user-id', userId)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(res.body.industry).toBe('fintech');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  it('isolates saved prompts by organization', async () => {
    const suffix = Date.now().toString(36);
    const organizationA = `org-a-${suffix}`;
    const organizationB = `org-b-${suffix}`;
    const promptA = `prompt-a-${suffix}`;
    const promptB = `prompt-b-${suffix}`;
    await db.query(
      `INSERT INTO organizations (id, name, slug, updated_at)
       VALUES ($1, 'Tenant A', $1, NOW()), ($2, 'Tenant B', $2, NOW())`,
      [organizationA, organizationB],
    );
    await db.query(
      `INSERT INTO generated_prompts (
         id, organization_id, industry, text, scores, dna, metadata,
         selected_principles, logos, saved, saved_at, updated_at
       ) VALUES
         ($1, $3, 'technology', 'Tenant prompt 0', '{}'::jsonb, '{}'::jsonb,
          '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, NOW(), NOW()),
         ($2, $4, 'technology', 'Tenant prompt 1', '{}'::jsonb, '{}'::jsonb,
          '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, NOW(), NOW())`,
      [promptA, promptB, organizationA, organizationB],
    );

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
      await db.query('DELETE FROM generated_prompts WHERE id = ANY($1::text[])', [
        [promptA, promptB],
      ]);
      await db.query('DELETE FROM organizations WHERE id = ANY($1::text[])', [
        [organizationA, organizationB],
      ]);
    }
  });
});

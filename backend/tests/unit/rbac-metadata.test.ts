import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DesignBrainController } from '../../src/design-brain/design-brain.controller';
import { PromptsController } from '../../src/prompts/prompts.controller';
import { QueueController } from '../../src/queue/queue.controller';
import {
  ALL_MEMBERS,
  BRAIN_ADMINS,
  CONTRIBUTORS,
  REQUIRED_ROLES,
} from '../../src/auth/roles.decorator';
import {
  PLATFORM_ADMINS,
  REQUIRED_PLATFORM_ROLES,
} from '../../src/auth/platform-roles.decorator';

function rolesFor(controller: object, method: string): string[] | undefined {
  const handler = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(controller),
    method,
  )?.value as object | undefined;
  return handler ? Reflect.getMetadata(REQUIRED_ROLES, handler) : undefined;
}

function platformRolesFor(controller: object, method: string): string[] | undefined {
  const handler = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(controller),
    method,
  )?.value as object | undefined;
  return handler ? Reflect.getMetadata(REQUIRED_PLATFORM_ROLES, handler) : undefined;
}

describe('RBAC endpoint metadata', () => {
  const brain = Object.create(DesignBrainController.prototype) as DesignBrainController;
  const prompts = Object.create(PromptsController.prototype) as PromptsController;
  const jobs = Object.create(QueueController.prototype) as QueueController;

  it.each([
    'health',
    'consolidate',
    'experiences',
    'experience',
    'runResearch',
    'previewResearch',
    'researchCandidates',
    'researchCandidate',
    'approveResearch',
    'rejectResearch',
    'checkPdfIngest',
    'pdfIngestProgress',
    'ingestPdf',
    'ingestImage',
  ])('keeps Brain admin operation %s admin-only', (method) => {
    expect(rolesFor(brain, method)).toEqual(BRAIN_ADMINS);
    expect(platformRolesFor(brain, method)).toEqual(PLATFORM_ADMINS);
  });

  it.each(['stats', 'tasteProfile', 'principleCategories', 'principles'])(
    'keeps curated Brain read %s available to all members',
    (method) => {
      expect(rolesFor(brain, method)).toEqual(ALL_MEMBERS);
    },
  );

  it.each([
    'generate',
    'recommend',
    'toggleSave',
    'submitLogoFeedback',
    'submitLogoTags',
    'generateLogo',
    'submitFeedback',
    'critique',
    'evolve',
  ])('prevents Viewer access to prompt operation %s', (method) => {
    expect(rolesFor(prompts, method)).toEqual(CONTRIBUTORS);
  });

  it('does not expose direct queue submission methods', () => {
    for (const method of [
      'enqueueFeedback',
      'enqueuePdf',
      'enqueueImage',
      'enqueueResearch',
      'enqueueConsolidation',
      'enqueuePrompt',
    ]) {
      expect(method in QueueController.prototype).toBe(false);
    }
    expect(rolesFor(jobs, 'getJobStatus')).toEqual(CONTRIBUTORS);
  });
});

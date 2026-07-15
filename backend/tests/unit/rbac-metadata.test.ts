import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DesignBrainController } from '../../src/design-brain/design-brain.controller';
import { PromptsController } from '../../src/prompts/prompts.controller';
import { BackgroundTasksController } from '../../src/background-tasks/background-tasks.controller';
import {
  ALL_MEMBERS,
  BRAIN_ADMINS,
  CONTRIBUTORS,
  REQUIRED_ROLES,
} from '../../src/auth/roles.decorator';
import {
  ADMINS,
  REQUIRED_ACCESS_ROLES,
} from '../../src/auth/platform-roles.decorator';

function rolesFor(controller: object, method: string): string[] | undefined {
  const handler = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(controller),
    method,
  )?.value as object | undefined;
  return handler ? Reflect.getMetadata(REQUIRED_ROLES, handler) : undefined;
}

function accessRolesFor(controller: object, method: string): string[] | undefined {
  const handler = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(controller),
    method,
  )?.value as object | undefined;
  return handler ? Reflect.getMetadata(REQUIRED_ACCESS_ROLES, handler) : undefined;
}

describe('RBAC endpoint metadata', () => {
  const brain = Object.create(DesignBrainController.prototype) as DesignBrainController;
  const prompts = Object.create(PromptsController.prototype) as PromptsController;
  const tasks = Object.create(
    BackgroundTasksController.prototype,
  ) as BackgroundTasksController;

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
    expect(accessRolesFor(brain, method)).toEqual(ADMINS);
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

  it('limits durable task status and cancellation to contributors', () => {
    expect(rolesFor(tasks, 'get')).toEqual(CONTRIBUTORS);
    expect(rolesFor(tasks, 'cancel')).toEqual(CONTRIBUTORS);
  });
});

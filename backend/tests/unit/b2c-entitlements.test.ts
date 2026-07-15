import { describe, expect, it } from 'vitest';
import {
  ACCESS_ROLES,
  PLAN_ENTITLEMENTS,
  PLANS,
} from '@logo-platform/shared';

describe('B2C access and plan entitlements', () => {
  it('exposes only ADMIN and USER as persisted access roles', () => {
    expect(ACCESS_ROLES).toEqual(['ADMIN', 'USER']);
  });

  it('uses the agreed FREE, PLUS and PRO plans', () => {
    expect(PLANS).toEqual(['FREE', 'PLUS', 'PRO']);
  });

  it.each([
    ['FREE', 10, 2],
    ['PLUS', 100, 20],
    ['PRO', 300, 60],
  ] as const)('sets independent %s prompt and logo quotas', (plan, prompts, logos) => {
    expect(PLAN_ENTITLEMENTS[plan].monthlyQuotas).toEqual({
      'prompt.compose': prompts,
      'image.generate': logos,
    });
  });
});

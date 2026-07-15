import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { PromptsController } from '../../src/prompts/prompts.controller';

const tenant = {
  userId: 'user-1',
  organizationId: 'org-1',
  role: 'OWNER' as const,
};

describe('direct interactive operations', () => {
  it('executes one prompt generation and one usage commit', async () => {
    const generateResponse = vi.fn().mockResolvedValue({
      prompts: [],
      bestPrompt: {},
    });
    const usage = {
      reserve: vi.fn().mockResolvedValue({ id: 'usage-1' }),
      commit: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new PromptsController(
      { generateResponse } as never,
      usage as never,
    );

    await controller.generate(
      { industry: 'software', variationCount: 1 } as never,
      undefined,
      tenant,
      'prompt-action-1',
      new EventEmitter() as never,
    );

    expect(generateResponse).toHaveBeenCalledTimes(1);
    expect(usage.reserve).toHaveBeenCalledTimes(1);
    expect(usage.commit).toHaveBeenCalledTimes(1);
    expect(usage.release).not.toHaveBeenCalled();
  });

  it('executes one image generation and never retries in the controller', async () => {
    const generateLogoForPrompt = vi.fn().mockResolvedValue({
      image: { id: 'logo-1' },
      logos: [{ id: 'logo-1' }],
      remaining: 4,
    });
    const usage = {
      reserve: vi.fn().mockResolvedValue({ id: 'usage-2' }),
      commit: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new PromptsController(
      { generateLogoForPrompt } as never,
      usage as never,
    );

    await controller.generateLogo(
      'prompt-1',
      { provider: 'openai' } as never,
      tenant,
      'image-action-1',
      new EventEmitter() as never,
    );

    expect(generateLogoForPrompt).toHaveBeenCalledTimes(1);
    expect(usage.commit).toHaveBeenCalledTimes(1);
    expect(usage.release).not.toHaveBeenCalled();
  });
});

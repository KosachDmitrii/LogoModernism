import type { ImageGenerationRequest, ImageGenerationResult, ImageProvider } from '@logo-platform/shared';
import { generateWithOpenAI } from './providers/openai.provider';
import { generateWithMock } from './providers/mock.provider';

export * from './prompt-enhancer';

export function resolveProvider(requested?: ImageProvider): ImageProvider {
  if (requested === 'mock') return 'mock';
  if (requested === 'openai') return 'openai';
  return process.env.OPENAI_API_KEY ? 'openai' : 'mock';
}

export async function generateImages(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const provider = resolveProvider(request.provider);

  if (provider === 'openai') {
    return generateWithOpenAI(request);
  }

  return generateWithMock(request);
}

export function getAvailableProviders(): { id: ImageProvider; name: string; available: boolean }[] {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  return [
    { id: 'openai', name: 'OpenAI DALL·E 3', available: hasOpenAI },
    { id: 'mock', name: 'Mock (local preview)', available: true },
  ];
}

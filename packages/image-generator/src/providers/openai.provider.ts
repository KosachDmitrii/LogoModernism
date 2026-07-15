import { randomUUID } from 'node:crypto';
import {
  fetchWithDeadline,
  type GeneratedImage,
  type ImageGenerationRequest,
  type ImageGenerationResult,
  type ImageSize,
} from '@logo-platform/shared';
import { enhanceLogoPrompt } from '../prompt-enhancer';

interface OpenAIImageResponse {
  data: Array<{ url?: string; revised_prompt?: string; b64_json?: string }>;
}

const OPENAI_IMAGE_RETRY_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504, 520, 522, 524]);
const OPENAI_IMAGE_MAX_ATTEMPTS = 1;
const DEFAULT_OPENAI_IMAGE_TIMEOUT_MS = 15 * 60_000;

function readEnv(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  return raw.replace(/^["']|["']$/g, '');
}

function getImageModel(): string {
  return readEnv('OPENAI_IMAGE_MODEL', 'gpt-image-1');
}

function getImageQuality(): string {
  return readEnv('OPENAI_IMAGE_QUALITY', 'high');
}

function getImageTimeoutMs(): number {
  const configured = Number(process.env.OPENAI_IMAGE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_OPENAI_IMAGE_TIMEOUT_MS;
}

function mapQualityForGptImage(quality: string): string {
  const normalized = quality.toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'auto') {
    return normalized;
  }
  if (normalized === 'standard' || normalized === 'hd') {
    return normalized === 'hd' ? 'high' : 'medium';
  }
  return 'high';
}

function mapQualityForDalle3(quality: string): 'standard' | 'hd' {
  const normalized = quality.toLowerCase();
  if (normalized === 'hd' || normalized === 'high') return 'hd';
  return 'standard';
}

function isGptImageModel(model: string): boolean {
  return model.startsWith('gpt-image');
}

function fitPromptToModel(prompt: string, model: string): string {
  const limit = isGptImageModel(model) ? 32_000 : 4_000;
  if (prompt.length <= limit) return prompt;

  const avoidIndex = prompt.lastIndexOf('Avoid:');
  if (avoidIndex < 0) return prompt.slice(0, limit);

  const avoid = prompt.slice(avoidIndex);
  const bodyLimit = Math.max(0, limit - avoid.length - 2);
  return `${prompt.slice(0, bodyLimit).trimEnd()} ${avoid}`.slice(0, limit);
}

function mapSizeForGptImage(size: ImageSize): string {
  const map: Record<ImageSize, string> = {
    '1024x1024': '1024x1024',
    '1024x1792': '1024x1536',
    '1792x1024': '1536x1024',
  };
  return map[size] ?? '1024x1024';
}

function buildRequestBody(
  model: string,
  prompt: string,
  size: ImageSize,
  count: number,
  quality: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    prompt: fitPromptToModel(prompt, model),
  };

  if (isGptImageModel(model)) {
    // gpt-image-* returns base64 only; response_format is not supported
    body.n = 1;
    body.size = mapSizeForGptImage(size);
    body.quality = mapQualityForGptImage(quality);
    body.output_format = 'png';
    // Opaque white background so dark marks stay visible on dark UI
    body.background = 'opaque';
    return body;
  }

  if (model === 'dall-e-3') {
    body.n = Math.min(count, 1);
    body.size = size;
    body.quality = mapQualityForDalle3(quality);
    body.style = 'natural';
    return body;
  }

  // dall-e-2 and others
  body.n = Math.min(count, 4);
  body.size = size === '1024x1792' || size === '1792x1024' ? '1024x1024' : size;
  return body;
}

function toImageUrl(item: { url?: string; b64_json?: string }): string {
  if (item.url) return item.url;
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  throw new Error('OpenAI response contained no image data');
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function compactErrorBody(body: string): string {
  const plain = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (plain || body).slice(0, 500);
}

async function postOpenAIImageRequest(
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  let lastError: Error | undefined;
  const idempotencyKey = randomUUID();

  for (let attempt = 1; attempt <= OPENAI_IMAGE_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithDeadline('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
        signal,
      }, { timeoutMs: getImageTimeoutMs() });

      if (!OPENAI_IMAGE_RETRY_STATUSES.has(response.status) || attempt === OPENAI_IMAGE_MAX_ATTEMPTS) {
        return response;
      }

      await response.text().catch(() => '');
      await sleep(800 * attempt, signal);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (signal?.aborted || attempt === OPENAI_IMAGE_MAX_ATTEMPTS) throw lastError;
      await sleep(800 * attempt, signal);
    }
  }

  throw lastError ?? new Error('OpenAI image generation request failed');
}

export async function generateWithOpenAI(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const enhancedPrompt = enhanceLogoPrompt(request);
  const size = request.size ?? '1024x1024';
  const count = Math.min(request.count ?? 1, 4);
  const model = getImageModel();
  const quality = getImageQuality();
  const body = buildRequestBody(model, enhancedPrompt, size, count, quality);

  const response = await postOpenAIImageRequest(apiKey, body, request.signal);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI image generation failed (${response.status}): ${compactErrorBody(errorBody)}`);
  }

  const data = (await response.json()) as OpenAIImageResponse;
  const [width, height] = size.split('x').map(Number);

  const images: GeneratedImage[] = data.data.map((item, index) => ({
    id: `img-openai-${Date.now()}-${index}`,
    url: toImageUrl(item),
    prompt: enhancedPrompt,
    provider: 'openai' as const,
    model,
    revisedPrompt: item.revised_prompt,
    width,
    height,
    createdAt: new Date().toISOString(),
  }));

  if (!images.length) {
    throw new Error('OpenAI returned no images');
  }

  return { images, provider: 'openai', model, enhancedPrompt };
}

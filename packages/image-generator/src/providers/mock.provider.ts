import type { GeneratedImage, ImageGenerationRequest, ImageGenerationResult } from '@logo-platform/shared';
import { enhanceLogoPrompt } from '../prompt-enhancer';

export async function generateWithMock(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const enhancedPrompt = enhanceLogoPrompt(request);
  const size = request.size ?? '1024x1024';
  const [width, height] = size.split('x').map(Number);
  const count = Math.min(request.count ?? 1, 4);

  const images: GeneratedImage[] = Array.from({ length: count }, (_, index) => {
    const svg = buildMockLogoSvg(enhancedPrompt, request.companyName, index, width, height);
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      id: `img-mock-${Date.now()}-${index}`,
      url: dataUrl,
      prompt: enhancedPrompt,
      provider: 'mock' as const,
      revisedPrompt: enhancedPrompt,
      width,
      height,
      createdAt: new Date().toISOString(),
    };
  });

  return { images, provider: 'mock', enhancedPrompt };
}

function buildMockLogoSvg(
  prompt: string,
  companyName: string | undefined,
  variant: number,
  width: number,
  height: number,
): string {
  const label = companyName ?? extractLabel(prompt);
  const shapes = [
    `<circle cx="512" cy="400" r="180" fill="none" stroke="#18181b" stroke-width="24"/>`,
    `<rect x="332" y="220" width="360" height="360" fill="none" stroke="#18181b" stroke-width="24"/>`,
    `<polygon points="512,220 692,580 332,580" fill="none" stroke="#18181b" stroke-width="24"/>`,
    `<path d="M332 400 H692 M512 220 V580" fill="none" stroke="#18181b" stroke-width="24"/>`,
  ];
  const shape = shapes[variant % shapes.length];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="50%" y="80" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" fill="#71717a">MOCK PREVIEW — set OPENAI_API_KEY for real generation</text>
  ${shape}
  <text x="50%" y="680" text-anchor="middle" font-family="system-ui,sans-serif" font-size="56" font-weight="600" fill="#18181b">${escapeXml(label.slice(0, 24))}</text>
  <text x="50%" y="740" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#a1a1aa">variant ${variant + 1}</text>
</svg>`;
}

function extractLabel(prompt: string): string {
  const match = prompt.match(/for "([^"]+)"/i);
  if (match) return match[1];
  const words = prompt.split(/\s+/).slice(0, 2).join(' ');
  return words || 'Logo';
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

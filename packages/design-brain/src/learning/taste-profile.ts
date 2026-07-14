import type { TasteProfile, TasteSignalType } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';

const POSITIVE: TasteSignalType[] = ['LIKE', 'APPROVE'];
const NEGATIVE: TasteSignalType[] = ['DISLIKE', 'REJECT'];

function extractTags(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword));
}

export async function computeTasteProfile(prisma: PrismaClient): Promise<TasteProfile> {
  const signals = await prisma.brainTasteSignal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      signalType: true,
      score: true,
      context: true,
      metadata: true,
    },
  });

  if (!signals.length) {
    return {
      preferredMarkTypes: ['wordmark', 'lettermark'],
      preferredGeometry: ['circle', 'grid-based'],
      preferredColors: ['black_white'],
      preferredRendering: ['flat vector'],
      avoidedPatterns: ['gradients', 'shadows', 'photorealism'],
      averageScore: 7,
      signalCount: 0,
      summary: 'No taste signals yet — using modernist defaults.',
    };
  }

  const markTypes = new Map<string, number>();
  const geometry = new Map<string, number>();
  const colors = new Map<string, number>();
  const rendering = new Map<string, number>();
  const avoided = new Map<string, number>();
  let scoreSum = 0;

  for (const signal of signals) {
    const metadata = (signal.metadata ?? {}) as Record<string, unknown>;
    const text = [signal.context, JSON.stringify(metadata)].join(' ').toLowerCase();
    const weight = POSITIVE.includes(signal.signalType)
      ? signal.score
      : NEGATIVE.includes(signal.signalType)
        ? -Math.abs(signal.score)
        : signal.score;

    scoreSum += signal.score;

    const workedTags = Array.isArray(metadata.workedTags) ? (metadata.workedTags as string[]) : [];
    const missedTags = Array.isArray(metadata.missedTags) ? (metadata.missedTags as string[]) : [];

    for (const tag of workedTags) {
      const lower = tag.toLowerCase();
      if (lower.includes('geometry')) geometry.set('geometric', (geometry.get('geometric') ?? 0) + Math.abs(weight));
      if (lower.includes('typography')) markTypes.set('wordmark', (markTypes.get('wordmark') ?? 0) + Math.abs(weight));
      if (lower.includes('color')) colors.set('monochrome', (colors.get('monochrome') ?? 0) + Math.abs(weight));
    }

    for (const tag of missedTags) {
      const key = tag.toLowerCase().replace(/\s+/g, '_');
      avoided.set(key, (avoided.get(key) ?? 0) + Math.abs(weight));
    }

    for (const mark of extractTags(text, ['wordmark', 'lettermark', 'combination', 'symbol', 'emblem'])) {
      markTypes.set(mark, (markTypes.get(mark) ?? 0) + weight);
    }

    for (const shape of extractTags(text, [
      'circle',
      'square',
      'triangle',
      'grid',
      'negative space',
      'geometric',
      'angular',
      'minimal',
    ])) {
      geometry.set(shape, (geometry.get(shape) ?? 0) + weight);
    }

    for (const color of extractTags(text, [
      'black_white',
      'monochrome',
      'two_color',
      'multi_color',
      'corporate_blue',
      'red_accent',
      'limited',
      'custom',
      'black',
      'white',
      'charcoal',
      'red',
      'orange',
      'yellow',
      'green',
      'blue',
      'purple',
      'brown',
      'gold',
    ])) {
      colors.set(color, (colors.get(color) ?? 0) + weight);
    }

    for (const render of extractTags(text, [
      'shadow',
      'shadows',
      'photoreal',
      'photorealism',
      'flat vector',
      'mockup',
      'realistic',
    ])) {
      rendering.set(render, (rendering.get(render) ?? 0) + weight);
    }

    if (weight < 0) {
      for (const pattern of extractTags(text, [
        'gradient',
        'shadow',
        '3d',
        'photoreal',
        'ornament',
        'complex',
        'cluttered',
      ])) {
        avoided.set(pattern, (avoided.get(pattern) ?? 0) + Math.abs(weight));
      }
    }
  }

  const topEntries = (map: Map<string, number>, limit = 5) =>
    [...map.entries()]
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);

  const preferredMarkTypes = topEntries(markTypes, 3);
  const preferredGeometry = topEntries(geometry, 5);
  const preferredColors = topEntries(colors, 5);
  const preferredRendering = topEntries(rendering, 5);
  const avoidedPatterns = topEntries(avoided, 6);

  const averageScore = Math.round((scoreSum / signals.length) * 10) / 10;

  return {
    preferredMarkTypes: preferredMarkTypes.length ? preferredMarkTypes : ['wordmark'],
    preferredGeometry: preferredGeometry.length ? preferredGeometry : ['geometric', 'minimal'],
    preferredColors,
    preferredRendering,
    avoidedPatterns: avoidedPatterns.length
      ? avoidedPatterns
      : ['gradients', 'shadows', 'photorealism'],
    averageScore,
    signalCount: signals.length,
    summary: buildTasteSummary(
      preferredMarkTypes,
      preferredGeometry,
      avoidedPatterns,
      averageScore,
      preferredColors,
      preferredRendering,
    ),
  };
}

function buildTasteSummary(
  markTypes: string[],
  geometry: string[],
  avoided: string[],
  avg: number,
  colors: string[] = [],
  rendering: string[] = [],
): string {
  return [
    `Prefers ${markTypes.join(', ') || 'modernist marks'}.`,
    `Favors ${geometry.join(', ') || 'geometric forms'}.`,
    colors.length ? `Color taste: ${colors.join(', ')}.` : '',
    rendering.length ? `Rendering taste: ${rendering.join(', ')}.` : '',
    `Avoids ${avoided.join(', ') || 'decorative effects'}.`,
    `Average taste score: ${avg}/10.`,
  ].filter(Boolean).join(' ');
}

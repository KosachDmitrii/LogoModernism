import type { PrismaClient } from '@logo-platform/database';

export interface ProjectMemory {
  companyName: string;
  likedMotifs: string[];
  dislikedMotifs: string[];
  preferredMarkTypes: string[];
  signalCount: number;
  summary: string;
}

const POSITIVE = new Set(['LIKE', 'APPROVE']);
const NEGATIVE = new Set(['DISLIKE', 'REJECT']);

function extractMotifs(text: string): string[] {
  const motifs: string[] = [];
  const patterns = [
    /\b(?:like|love|prefer)\s+([^.,;]+)/gi,
    /\b(?:dislike|hate|avoid)\s+([^.,;]+)/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const chunk = match[1]?.trim();
      if (chunk && chunk.length >= 3) motifs.push(chunk);
    }
  }
  return motifs;
}

export async function loadProjectMemory(
  prisma: PrismaClient,
  companyName?: string,
): Promise<ProjectMemory | undefined> {
  const name = companyName?.trim();
  if (!name) return undefined;

  const signals = await prisma.brainTasteSignal.findMany({
    where: {
      OR: [
        { context: { contains: name, mode: 'insensitive' } },
        { metadata: { path: ['companyName'], equals: name } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  if (!signals.length) return undefined;

  const likedMotifs: string[] = [];
  const dislikedMotifs: string[] = [];
  const markTypes = new Map<string, number>();

  for (const signal of signals) {
    const text = [signal.context, JSON.stringify(signal.metadata ?? {})].join(' ');
    const motifs = extractMotifs(text);

    if (POSITIVE.has(signal.signalType)) {
      likedMotifs.push(...motifs);
      for (const mark of ['wordmark', 'lettermark', 'combination']) {
        if (text.toLowerCase().includes(mark)) {
          markTypes.set(mark, (markTypes.get(mark) ?? 0) + signal.score);
        }
      }
    } else if (NEGATIVE.has(signal.signalType)) {
      dislikedMotifs.push(...motifs);
    }
  }

  const preferredMarkTypes = [...markTypes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([mark]) => mark)
    .slice(0, 2);

  return {
    companyName: name,
    likedMotifs: [...new Set(likedMotifs)].slice(0, 8),
    dislikedMotifs: [...new Set(dislikedMotifs)].slice(0, 8),
    preferredMarkTypes,
    signalCount: signals.length,
    summary:
      signals.length > 0
        ? `Project memory for "${name}": ${signals.length} signals, ` +
          `${likedMotifs.length ? `liked ${likedMotifs.slice(0, 3).join(', ')}` : 'no liked motifs yet'}` +
          `${dislikedMotifs.length ? `; avoid ${dislikedMotifs.slice(0, 3).join(', ')}` : ''}.`
        : `No project memory for "${name}".`,
  };
}

import type { BrainTasteSignalRow, DatabaseClient } from '../storage/database-types';
import type { BrainTenantScope } from '@logo-platform/shared';

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
  client: DatabaseClient,
  companyName?: string,
  scope?: BrainTenantScope,
): Promise<ProjectMemory | undefined> {
  if (!scope?.organizationId) {
    throw new Error('Organization scope is required for project memory');
  }
  const name = companyName?.trim();
  if (!name) return undefined;

  const values: unknown[] = [scope.organizationId, `%${name}%`, name];
  const filters = [
    'organization_id = $1',
    `(context ILIKE $2 OR metadata->>'companyName' = $3)`,
  ];
  if (scope.projectId) {
    values.push(scope.projectId);
    filters.push(`project_id = $${values.length}`);
  }
  const { rows: signals } = await client.query<BrainTasteSignalRow>(
    `SELECT * FROM design_brain_taste_signals
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 100`,
    values,
  );

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

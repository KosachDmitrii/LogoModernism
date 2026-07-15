import type { BrainResearchRunResult, BrainTenantScope } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { computeTasteProfile } from './taste-profile';
import { runWebResearch } from '../research/research.service';

const DEFAULT_TOPICS = [
  'Swiss modernism logo construction',
  'logo grid geometry',
  'wordmark typography',
  'negative space logo design',
  'brand identity system',
];

function nightlyMaxSources(): number {
  const raw = Number(process.env.BRAIN_NIGHTLY_RESEARCH_MAX_SOURCES ?? 8);
  if (!Number.isFinite(raw) || raw < 1) return 8;
  return Math.min(20, Math.floor(raw));
}

function configuredTopics(): string[] {
  const raw = process.env.BRAIN_NIGHTLY_RESEARCH_TOPICS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
}

async function pickResearchTopics(
  prisma: PrismaClient,
  scope: BrainTenantScope,
): Promise<string[]> {
  const manual = configuredTopics();
  if (manual.length) {
    return manual.slice(0, 2);
  }

  const taste = await computeTasteProfile(prisma, scope);
  const dynamic = [
    ...taste.preferredGeometry.slice(0, 2).map((item) => `${item} logo construction`),
    ...taste.preferredMarkTypes.slice(0, 1).map((item) => `${item} logo design`),
  ];

  const topics = [...new Set([...dynamic, ...DEFAULT_TOPICS])].filter(Boolean);
  return topics.slice(0, 2);
}

export async function runNightlyResearch(): Promise<{
  topics: string[];
  results: BrainResearchRunResult[];
}> {
  const { prisma } = await import('@logo-platform/database');
  if (!process.env.DATABASE_URL) {
    return { topics: [], results: [] };
  }
  const organization = await prisma.organization.findUnique({
    where: {
      slug:
        process.env.BRAIN_GLOBAL_ORGANIZATION_SLUG?.trim() ||
        'logo-modernism',
    },
    select: { id: true },
  });
  if (!organization) {
    return { topics: [], results: [] };
  }
  const scope: BrainTenantScope = {
    organizationId: organization.id,
  };

  const topics = await pickResearchTopics(prisma, scope);
  const results: BrainResearchRunResult[] = [];

  for (const topic of topics) {
    try {
      const result = await runWebResearch(prisma, topic, scope, nightlyMaxSources());
      results.push(result);
      console.info(
        `[design-brain] nightly research "${topic}": ${result.candidates.length} candidates, ${result.skippedUrls.length} skipped`,
      );
    } catch (error) {
      console.error(`[design-brain] nightly research failed for "${topic}":`, error);
    }
  }

  return { topics, results };
}

export function scheduleNightlyResearch(
  run: () => Promise<unknown>,
  hourUtc = 4,
): NodeJS.Timeout {
  const msPerHour = 60 * 60 * 1000;

  const tick = async () => {
    const now = new Date();
    if (now.getUTCHours() !== hourUtc) return;
    try {
      await run();
    } catch (error) {
      console.error('[design-brain] nightly research failed:', error);
    }
  };

  return setInterval(tick, msPerHour);
}

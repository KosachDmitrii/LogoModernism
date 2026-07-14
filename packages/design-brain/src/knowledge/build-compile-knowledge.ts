import { getPrincipleById, filterStructurePrincipleIds } from '@logo-platform/knowledge-base';
import type { BrainExperienceRecord, CompileKnowledgeContext, LogoMarkType, TasteProfile } from '@logo-platform/shared';

const TAG_TO_AVOID: Record<string, string> = {
  geometry: 'off-brief geometry',
  typography: 'generic stock typography',
  color: 'off-palette color treatment',
  scalability: 'low legibility at small sizes',
  brief_fit: 'off-brief decorative effects',
  originality: 'derivative trademark likeness',
  construction: 'sloppy construction',
  industry_fit: 'wrong sector visual clichés',
};

const TAG_TO_CUE: Record<string, string> = {
  geometry: 'precise geometric construction',
  typography: 'custom letterform discipline',
  color: 'controlled palette discipline',
  scalability: 'small-size legibility',
  brief_fit: 'strict brief adherence',
  originality: 'original mark not derivative',
  construction: 'grid-based construction',
  industry_fit: 'sector-appropriate form language',
};

const TASTE_AVOID_MAP: Record<string, string> = {
  gradient: 'gradients',
  gradients: 'gradients',
  shadow: 'shadows and depth effects',
  shadows: 'shadows and depth effects',
  photoreal: 'photorealistic rendering',
  photorealism: 'photorealistic rendering',
  '3d': '3d effects',
  complex: 'overly complex forms',
  cluttered: 'cluttered composition',
  ornament: 'decorative ornament',
  brief_fit: 'off-brief decorative effects',
  brieffit: 'off-brief decorative effects',
  scalability: 'low legibility at small sizes',
  geometry: 'off-brief geometry',
  typography: 'generic stock typography',
  color: 'off-palette color treatment',
  mockup: 'mockup presentation',
  realistic: 'realistic rendering',
};

const RETRIEVAL_NOISE =
  /successful generation|brief compiler generated|taste signal|score\s*\d|ingest|feedback:|prompt saved to favorites|prompt quality|company:\s*\w/i;

function normalizeAvoidKey(pattern: string): string {
  return pattern.toLowerCase().replace(/[\s-]+/g, '_').trim();
}

export function humanizeTasteAvoidPattern(pattern: string): string | undefined {
  const key = normalizeAvoidKey(pattern);
  if (TASTE_AVOID_MAP[key]) return TASTE_AVOID_MAP[key];
  if (TAG_TO_AVOID[key]) return TAG_TO_AVOID[key];
  if (pattern.includes(' ') && pattern.length >= 8) return pattern;
  return undefined;
}

function isUsefulRetrievalFragment(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 12) return false;
  if (RETRIEVAL_NOISE.test(trimmed)) return false;
  return true;
}

export function retrievalCueFromExperiences(
  experiences: BrainExperienceRecord[],
): string | undefined {
  const top = experiences
    .filter((e) => (e.similarity ?? 0) >= 0.45)
    .filter((e) => (e.metadata as { kind?: string } | undefined)?.kind !== 'prompt_saved')
    .slice(0, 3);
  if (!top.length) return undefined;

  const fragments = top
    .map((e) => {
      const summary = e.summary?.trim();
      if (summary && isUsefulRetrievalFragment(summary)) return summary.slice(0, 120);
      const content = e.content.slice(0, 120).replace(/\s+/g, ' ');
      return isUsefulRetrievalFragment(content) ? content : undefined;
    })
    .filter((line): line is string => Boolean(line));

  if (!fragments.length) return undefined;
  return `Prior project cues: ${[...new Set(fragments)].slice(0, 2).join('; ')}`;
}

export function tasteAvoidFromProfile(profile: TasteProfile): string[] {
  const mapped = profile.avoidedPatterns
    .map((pattern) => humanizeTasteAvoidPattern(pattern))
    .filter((line): line is string => Boolean(line));
  return [...new Set(mapped)];
}

export function principlesFromIds(ids?: string[], markType?: LogoMarkType): string[] {
  if (!ids?.length) return [];
  const filtered = filterStructurePrincipleIds(ids, markType);
  const fragments: string[] = [];
  for (const id of filtered.slice(0, 6)) {
    const principle = getPrincipleById(id);
    if (principle?.promptFragment) fragments.push(principle.promptFragment);
  }
  return [...new Set(fragments)];
}

export function projectMemoryFromExperiences(
  experiences: BrainExperienceRecord[],
): { worked: string[]; avoid: string[] } {
  const worked = new Set<string>();
  const avoid = new Set<string>();

  for (const exp of experiences) {
    const meta = exp.metadata ?? {};
    const workedTags = Array.isArray(meta.workedTags) ? (meta.workedTags as string[]) : [];
    const missedTags = Array.isArray(meta.missedTags) ? (meta.missedTags as string[]) : [];

    for (const tag of workedTags) {
      const cue = TAG_TO_CUE[tag.toLowerCase()];
      if (cue) worked.add(cue);
    }
    for (const tag of missedTags) {
      const cue = TAG_TO_AVOID[tag.toLowerCase()];
      if (cue) avoid.add(cue);
    }
  }

  return { worked: [...worked], avoid: [...avoid] };
}

export function buildCompileKnowledgeContext(input: {
  tasteProfile: TasteProfile;
  retrievedExperiences: BrainExperienceRecord[];
  projectMemory: BrainExperienceRecord[];
  analysisPrincipleIds?: string[];
  markType?: LogoMarkType;
}): CompileKnowledgeContext | undefined {
  const tasteAvoid = tasteAvoidFromProfile(input.tasteProfile);
  const retrievalCue = retrievalCueFromExperiences(input.retrievedExperiences);
  const principleFragments = principlesFromIds(input.analysisPrincipleIds, input.markType);
  const { worked, avoid } = projectMemoryFromExperiences(input.projectMemory);

  if (
    !tasteAvoid.length &&
    !retrievalCue &&
    !principleFragments.length &&
    !worked.length &&
    !avoid.length
  ) {
    return undefined;
  }

  return {
    retrievalCue,
    tasteAvoidPatterns: tasteAvoid,
    principleFragments,
    projectWorkedCues: worked,
    projectAvoidCues: avoid,
  };
}

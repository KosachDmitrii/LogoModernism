import type { CompileKnowledgeContext } from '@logo-platform/shared';
import type { ResolvedBrief } from './types';

export interface KnowledgeEnrichment {
  retrievalCue?: string;
  principleFragments: string[];
  extraAvoid: string[];
  priorDirection?: string;
}

export function buildKnowledgeEnrichment(
  knowledge?: CompileKnowledgeContext,
): KnowledgeEnrichment | undefined {
  if (!knowledge) return undefined;

  const extraAvoid = [...knowledge.tasteAvoidPatterns, ...knowledge.projectAvoidCues].filter(Boolean);
  const priorParts = [knowledge.retrievalCue, ...knowledge.projectWorkedCues].filter(Boolean);
  const principleFragments = knowledge.principleFragments.filter(Boolean);

  if (!extraAvoid.length && !priorParts.length && !principleFragments.length) {
    return undefined;
  }

  return {
    retrievalCue: knowledge.retrievalCue,
    principleFragments: [...new Set(principleFragments)],
    extraAvoid: [...new Set(extraAvoid)],
    priorDirection: priorParts.length ? priorParts.join('; ') : undefined,
  };
}

export function mergeKnowledgeIntoBrief(
  resolved: ResolvedBrief,
  enrichment?: KnowledgeEnrichment,
): ResolvedBrief {
  if (!enrichment?.extraAvoid.length) return resolved;
  return {
    ...resolved,
    forbiddenMotifs: [...new Set([...resolved.forbiddenMotifs, ...enrichment.extraAvoid])],
  };
}

import type { CompileKnowledgeContext } from '@logo-platform/shared';
import type { ResolvedBrief } from './types';
import { filterAvoidForRenderEffects } from './render-effects';

export interface KnowledgeEnrichment {
  principleFragments: string[];
  extraAvoid: string[];
}

export function buildKnowledgeEnrichment(
  knowledge?: CompileKnowledgeContext,
): KnowledgeEnrichment | undefined {
  if (!knowledge) return undefined;

  const extraAvoid = [...knowledge.tasteAvoidPatterns, ...knowledge.projectAvoidCues].filter(Boolean);
  const principleFragments = knowledge.principleFragments.filter(Boolean);

  if (!extraAvoid.length && !principleFragments.length) {
    return undefined;
  }

  return {
    principleFragments: [...new Set(principleFragments)],
    extraAvoid: [...new Set(extraAvoid)],
  };
}

export function mergeKnowledgeIntoBrief(
  resolved: ResolvedBrief,
  enrichment?: KnowledgeEnrichment,
): ResolvedBrief {
  if (!enrichment?.extraAvoid.length) return resolved;

  const filteredAvoid = filterAvoidForRenderEffects(enrichment.extraAvoid, {
    allowShadows: resolved.allowShadows,
    allowPhotoreal: resolved.allowPhotoreal,
  });

  return {
    ...resolved,
    forbiddenMotifs: [...new Set([...resolved.forbiddenMotifs, ...filteredAvoid])],
  };
}

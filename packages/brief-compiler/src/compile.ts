import { createHash } from 'node:crypto';
import type { CompileRequest, CompileResult, CompiledPrompt, PromptExperience } from './types';
import { buildCanonicalBrief } from './ingress';
import { buildKnowledgeEnrichment, mergeKnowledgeIntoBrief } from './knowledge-enrichment';
import { resolveConflicts } from './resolver';
import { planVariants } from './variant-planner';
import { buildPromptSchema } from './schema';
import { renderNegative, renderPositive } from './renderer';
import { computeReadiness, validateCompiled } from './validator';

function briefHash(resolved: CompileResult['resolved'], variantIndex: number): string {
  const payload = JSON.stringify({
    industry: resolved.industry,
    companyName: resolved.companyName,
    markType: resolved.markType,
    typographyStyle: resolved.typographyStyle,
    typographyDetails: resolved.typographyDetails,
    era: resolved.era,
    shapes: resolved.shapes,
    shapeRequirement: resolved.shapeRequirement,
    construction: resolved.construction,
    composition: resolved.composition,
    colorPalette: resolved.colorPalette,
    colorSelections: resolved.colorSelections,
    clientNotes: resolved.clientNotes,
    clientContext: resolved.clientContext,
    allowShadows: resolved.allowShadows,
    allowPhotoreal: resolved.allowPhotoreal,
    referenceIds: resolved.references.map((reference) => reference.catalogId),
    variantIndex,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function compileBrief(request: CompileRequest): CompileResult {
  const canonical = buildCanonicalBrief(request);
  const resolved = resolveConflicts(canonical);
  const enrichment = buildKnowledgeEnrichment(request.compileKnowledge);
  const enriched = mergeKnowledgeIntoBrief(resolved, enrichment);
  const variantCount = Math.min(request.variationCount ?? 1, 5);
  const plans = planVariants(variantCount, request.preferredTerritoryId);

  const prompts: CompiledPrompt[] = plans.map((plan) => {
    const schema = buildPromptSchema(enriched, plan, enrichment);
    return {
      positive: renderPositive(schema),
      negative: renderNegative(schema, {
        allowShadows: enriched.allowShadows,
        allowPhotoreal: enriched.allowPhotoreal,
      }),
      schema,
      briefHash: briefHash(resolved, plan.index),
    };
  });

  const validation = validateCompiled(enriched, prompts);
  const readiness = computeReadiness(enriched);

  return { resolved: enriched, prompts, validation, readiness };
}

export function createPromptExperience(
  compiled: CompiledPrompt,
  outcome: PromptExperience['outcome'] = 'generated',
): PromptExperience {
  return {
    id: `${compiled.briefHash}-${compiled.schema.variantIndex}`,
    briefHash: compiled.briefHash,
    schemaVersion: compiled.schema.version,
    positive: compiled.positive,
    negative: compiled.negative,
    variantAxis: compiled.schema.variantAxis,
    outcome,
    workedTags: [],
    missedTags: [],
    violations: [],
    timestamp: new Date().toISOString(),
  };
}

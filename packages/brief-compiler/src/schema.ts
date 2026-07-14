import { buildIndustryLineForBrief } from './industry-direction';
import type { KnowledgeEnrichment } from './knowledge-enrichment';
import type { VariantPlan } from './variant-planner';
import type { TypographicIntegration } from './typographic-integration';
import {
  detectTypographicIntegration,
  typographicAvoidExtras,
} from './typographic-integration';
import type { PromptSchema, PromptSchemaSection, ResolvedBrief } from './types';
import { SCHEMA_VERSION } from './types';
import {
  colorLine,
  eraLabel,
  geometryVocabulary,
  isMonochromePalette,
} from './normalizers';

function typographyLine(
  style: ResolvedBrief['typographyStyle'],
  integration?: TypographicIntegration,
): string {
  if (integration) {
    return (
      'Constructed rebus letterforms — one distinctive glyph integrates image and letter via negative space'
    );
  }
  if (style === 'modified_glyph') {
    return 'Constructed geometric letterforms with one modified distinctive glyph carrying brand character';
  }
  if (style === 'monogram_ligature') {
    return 'Interlocked monogram ligature — initials fused into one compact unified letterform';
  }
  if (style === 'constructed') {
    return 'Constructed geometric letterforms with one modified distinctive glyph';
  }
  return 'Custom neo-grotesque wordmark with one modified distinctive glyph';
}

function markTypeLine(brief: ResolvedBrief, integration?: TypographicIntegration): string {
  if (integration) return 'Wordmark rebus';
  switch (brief.markType) {
    case 'wordmark':
      return 'Wordmark';
    case 'lettermark':
      return 'Lettermark';
    default:
      return 'Combination mark';
  }
}

function creativeDirectionLine(
  plan: VariantPlan,
  integration?: TypographicIntegration,
  rebusWordmark?: boolean,
): string {
  if (integration && (plan.axis === 'typography_led' || rebusWordmark)) {
    return `Typography-led rebus wordmark — ${integration.promptLine}`;
  }
  if (integration && plan.axis === 'balanced') {
    return `Balanced rebus wordmark — ${integration.promptLine}`;
  }
  return plan.creativeDirection;
}

function inspiredByLine(brief: ResolvedBrief): string | undefined {
  if (!brief.reference) return undefined;
  const ref = brief.reference;
  if (ref.likenessRisk === 'high') {
    return (
      `Inspired by ${ref.structureCue} in the modernist lineage associated with ${ref.attributionLabel}, ` +
      'while remaining fully original — structure and principles only, not a visual copy of the reference'
    );
  }
  return (
    `Inspired by ${ref.structureCue} associated with ${ref.attributionLabel}, ` +
    'while remaining fully original and not a copy'
  );
}

function complexityLine(minimalism: ResolvedBrief['minimalism']): string {
  switch (minimalism) {
    case 'ultra':
      return 'minimal complexity, ultra minimal elements';
    case 'moderate':
      return 'moderate complexity, reductive essential forms';
    default:
      return 'minimal complexity, radically simplified';
  }
}

function industryLine(brief: ResolvedBrief): string | undefined {
  return buildIndustryLineForBrief(brief);
}

export function buildPromptSchema(
  brief: ResolvedBrief,
  plan: VariantPlan,
  enrichment?: KnowledgeEnrichment,
): PromptSchema {
  const sections: PromptSchemaSection[] = [];
  const integration = detectTypographicIntegration(brief);

  const push = (key: string, text: string, source: PromptSchemaSection['provenance']['source']) => {
    if (!text?.trim()) return;
    sections.push({ key, text: text.trim().replace(/\.\s*$/, ''), provenance: { section: key, value: text, source } });
  };

  push('task', 'Minimal geometric logo design', 'system');

  if (brief.companyName) {
    push(
      'brand_lock',
      `Brand name must read exactly '${brief.companyName}' letter-for-letter`,
      'brand_lock',
    );
  }

  push('mark_type', markTypeLine(brief, integration), brief.reference ? 'reference' : 'client');

  const inspired = inspiredByLine(brief);
  if (inspired) push('inspired_by', inspired, 'reference');

  push('geometry', `Geometry vocabulary: ${geometryVocabulary(brief.shapes)}`, 'client');
  push('construction', `Construction: ${brief.construction}`, brief.reference ? 'reference' : 'client');
  push(
    'composition',
    `Composition: ${integration ? 'negative space figure-ground letterform integration' : brief.composition}`,
    integration ? 'client' : brief.reference ? 'reference' : 'client',
  );

  push('typography', `Typography: ${typographyLine(brief.typographyStyle, integration)}`, 'client');

  if (integration) {
    push('typographic_integration', `Typographic integration: ${integration.promptLine}`, 'client');
  }

  const industry = industryLine(brief);
  if (industry) push('industry', industry, 'system');

  if (brief.inspiration) {
    push('mood', `Creative mood: ${brief.inspiration}`, 'client');
  }

  push('balance', 'Balance: optically balanced, balance through reduction', 'system');
  push('complexity', `Complexity: ${complexityLine(brief.minimalism)}`, 'client');
  push('era', `Era: ${eraLabel(brief.era)}`, brief.reference ? 'reference' : 'client');
  push('color', `Color: ${colorLine(brief.colorPalette, brief.colorSelections)}`, 'client');

  const rendering = [
    'flat vector illustration',
    'scalable silhouette readable at small sizes',
    brief.allowShadows ? 'subtle depth allowed' : 'no shadows no depth effects',
    brief.allowPhotoreal ? 'controlled photoreal finish' : 'no gradients',
  ].join(', ');
  push('rendering', `Rendering: ${rendering}`, 'system');

  push(
    'creative_direction',
    `Creative direction: ${creativeDirectionLine(plan, integration, brief.rebusWordmark)}`,
    'system',
  );

  if (enrichment?.priorDirection) {
    push('prior_direction', `Prior direction: ${enrichment.priorDirection}`, 'system');
  }

  if (enrichment?.principleFragments.length) {
    push(
      'design_principles',
      `Design principles: ${enrichment.principleFragments.join(', ')}`,
      'system',
    );
  }

  const avoidBase = [
    'generic circular bracket templates',
    'disconnected floating symbols',
    'stock Helvetica wordmarks',
    'literal clipart',
    ...(integration ? typographicAvoidExtras() : []),
    ...brief.forbiddenMotifs,
  ];
  push('avoid', `Avoid: ${[...new Set(avoidBase)].join(', ')}`, 'client');

  return {
    version: SCHEMA_VERSION,
    variantAxis: plan.axis,
    variantIndex: plan.index,
    sections,
  };
}

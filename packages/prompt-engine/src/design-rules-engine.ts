import type { DesignRule, Era, InspirationMode, LogoDNA, LogoMarkType, Recommendation, TypographyStyle } from '@logo-platform/shared';
import {
  designPrinciples,
  getConflictingPrinciples,
  getPrincipleById,
  getCompatiblePrinciples,
  searchPrinciples,
  buildCatalogPromptContext,
} from '@logo-platform/knowledge-base';
import {
  filterPrincipleIdsForMarkType,
  isPrincipleAllowedForMarkType,
  shouldSkipCategoryForMarkType,
} from './mark-type-filter';

const INSPIRATION_MAP: Record<InspirationMode, string[]> = {
  swiss: ['era-swiss', 'typ-swiss-typography', 'con-equal-width-lines'],
  bauhaus: ['era-bauhaus', 'typ-bauhaus-typography', 'geo-angular'],
  ibm: ['insp-ibm', 'con-grid-based', 'con-modular-grid'],
  nasa: ['insp-nasa', 'mark-iconic-symbol', 'comp-overlay'],
  lufthansa: ['insp-lufthansa', 'geo-circle', 'comp-negative-space'],
  braun: ['insp-braun', 'cx-high-simplicity', 'render-timeless'],
  cbs: ['insp-cbs', 'mark-iconic-symbol', 'geo-circle'],
  abc: ['insp-abc', 'geo-circle', 'mark-iconic-symbol'],
  olivetti: ['insp-olivetti', 'era-1960s', 'comp-negative-space'],
  westinghouse: ['insp-westinghouse', 'geo-circle', 'mark-corporate-mark'],
};

const CATEGORY_ORDER: DesignRule['category'][] = [
  'industry',
  'geometry',
  'construction',
  'composition',
  'grid',
  'typography',
  'stroke',
  'balance',
  'complexity',
  'era',
  'color',
  'effects',
  'mark_type',
  'rendering',
];

/** Curated modernist rules — excludes synthetic enterprise bulk (ent-*) */
const CURATED_PRINCIPLES = designPrinciples.filter((p) => !p.id.startsWith('ent-'));

export interface RuleSelectionInput {
  industry: string;
  companyName?: string;
  preferredEra?: Era;
  minimalismLevel?: number;
  inspirationMode?: InspirationMode;
  variationSeed?: number;
  /** Locked-in from Brand DNA / Pipeline / Knowledge Graph analysis */
  analysisPrincipleIds?: string[];
  /** Logo catalog reference IDs (Müller Logo Modernism) */
  catalogReferenceIds?: string[];
  catalogNarrative?: string;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
}

export interface RuleSelectionResult {
  principles: DesignRule[];
  dna: LogoDNA;
  recommendations: Recommendation[];
  conflicts: string[][];
  catalogInspiration?: string[];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shufflePool<T>(pool: T[], rand: () => number): T[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickWeighted(rules: DesignRule[], rand: () => number, count: number): DesignRule[] {
  const pool = shufflePool(rules, rand);
  const picked: DesignRule[] = [];
  while (picked.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0);
    let roll = rand() * totalWeight;
    let selectedIndex = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll <= 0) {
        selectedIndex = i;
        break;
      }
    }
    picked.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }
  return picked;
}

function resolveIndustryRules(industry: string): DesignRule[] {
  const normalized = industry.toLowerCase().trim();
  const industryRules = searchPrinciples({ industry: normalized });

  if (industryRules.length > 0) {
    return industryRules
      .filter((r) => r.category === 'industry' && !r.id.startsWith('ent-'))
      .slice(0, 2);
  }

  const keywordRules = CURATED_PRINCIPLES.filter(
    (p) =>
      p.category === 'industry' &&
      (p.tags.some((t) => normalized.includes(t) || t.includes(normalized)) ||
        p.name.toLowerCase().includes(normalized)),
  );

  if (keywordRules.length > 0) return keywordRules.slice(0, 2);

  return [getPrincipleById('ind-tech')!].filter(Boolean);
}

function eraPrincipleId(era: Era): string {
  return `era-${era.replace(/_/g, '-')}`;
}

export function selectDesignRules(input: RuleSelectionInput): RuleSelectionResult {
  const rand = seededRandom(input.variationSeed ?? Date.now());
  const selected: DesignRule[] = [];
  const selectedIds = new Set<string>();
  const markFilterOptions = { typographyStyle: input.typographyStyle };

  const addRule = (rule: DesignRule | undefined) => {
    if (!rule || selectedIds.has(rule.id)) return;
    if (!isPrincipleAllowedForMarkType(rule, input.markType, markFilterOptions)) return;
    const conflicts = getConflictingPrinciples([...selectedIds, rule.id]);
    if (conflicts.length > 0) return;
    selected.push(rule);
    selectedIds.add(rule.id);
  };

  for (const rule of resolveIndustryRules(input.industry)) {
    addRule(rule);
  }

  // Analysis-driven principles (Brand DNA, Pipeline, Knowledge Graph, Logo Catalog)
  const catalogContext = buildCatalogPromptContext(input.catalogReferenceIds ?? [], {
    narrative: input.catalogNarrative,
    typographyStyle: input.typographyStyle,
  });
  const lockedPrincipleIds = filterPrincipleIdsForMarkType(
    [
      ...(input.analysisPrincipleIds ?? []),
      ...(catalogContext?.principleIds ?? []),
    ],
    input.markType,
  );
  if (lockedPrincipleIds.length) {
    for (const id of lockedPrincipleIds) {
      addRule(getPrincipleById(id));
    }
    // Expand via knowledge graph compatibility
    for (const id of [...selectedIds]) {
      for (const compatible of getCompatiblePrinciples(id).slice(0, 2)) {
        if (compatible.category !== 'industry' && !compatible.id.startsWith('ent-')) {
          addRule(compatible);
        }
      }
    }
  }

  if (input.inspirationMode) {
    for (const id of INSPIRATION_MAP[input.inspirationMode] ?? []) {
      addRule(getPrincipleById(id));
    }
  }

  if (input.preferredEra) {
    addRule(getPrincipleById(eraPrincipleId(input.preferredEra)));
  } else if (catalogContext?.eras.length === 1) {
    addRule(getPrincipleById(eraPrincipleId(catalogContext.eras[0])));
  } else {
    const eraRules = CURATED_PRINCIPLES.filter((p) => p.category === 'era' && p.era?.length);
    addRule(pickWeighted(eraRules, rand, 1)[0]);
  }

  const hasCatalog = Boolean(catalogContext);
  const catalogBackedCategories = new Set<DesignRule['category']>([
    'geometry',
    'construction',
    'composition',
    'typography',
    'mark_type',
  ]);

  for (const category of CATEGORY_ORDER) {
    if (['industry', 'era', 'inspiration'].includes(category)) continue;
    if (shouldSkipCategoryForMarkType(category, input.markType, markFilterOptions)) continue;

    const pool = CURATED_PRINCIPLES.filter((p) => {
      if (p.category !== category) return false;
      if (selectedIds.has(p.id)) return false;

      const compatibleWithSelected = selected.some(
        (s) =>
          s.compatibility.includes(p.id) ||
          p.compatibility.includes(s.id) ||
          s.compatibility.some((c) => p.tags.includes(c) || p.id.includes(c)),
      );

      if (selected.length > 3 && !compatibleWithSelected && category !== 'rendering') {
        return rand() > 0.6;
      }
      return true;
    });

    const count = hasCatalog && catalogBackedCategories.has(category)
      ? 0
      : category === 'rendering'
        ? 3
        : category === 'geometry' || category === 'construction'
          ? 2
          : 1;

    for (const rule of pickWeighted(pool, rand, count)) {
      addRule(rule);
    }
  }

  const renderingDefaults = ['render-flat-vector', 'render-no-shadows', 'render-timeless', 'color-no-gradient'];
  for (const id of renderingDefaults) {
    addRule(getPrincipleById(id));
  }

  const minimalism = input.minimalismLevel ?? 8;
  if (minimalism >= 7) {
    addRule(getPrincipleById('cx-minimal-complexity'));
    addRule(getPrincipleById('cx-high-simplicity'));
  }

  if (input.markType === 'wordmark') {
    addRule(getPrincipleById('typ-wordmark'));
  }

  if (input.typographyStyle === 'constructed') {
    for (const id of ['con-modular-grid', 'con-grid-based', 'typ-custom-letterform', 'comp-stacked']) {
      addRule(getPrincipleById(id));
    }
  }

  const dna = buildLogoDNA(selected, input, catalogContext);
  const recommendations = buildRecommendations(input.industry, selected, input.markType);
  const conflicts = getConflictingPrinciples(selected.map((p) => p.id));

  return {
    principles: selected,
    dna,
    recommendations,
    conflicts,
    catalogInspiration: catalogContext?.inspirationFragments,
  };
}

function buildLogoDNA(
  principles: DesignRule[],
  input: RuleSelectionInput,
  catalogContext?: ReturnType<typeof buildCatalogPromptContext>,
): LogoDNA {
  const byCategory = (cat: DesignRule['category']) =>
    principles.filter((p) => p.category === cat).map((p) => p.name);

  const complexityRule = principles.find((p) => p.category === 'complexity');
  const eraRule = principles.find((p) => p.category === 'era');

  const constructed = input.typographyStyle === 'constructed';
  const typographicOnly =
    input.markType === 'wordmark' || input.markType === 'lettermark';

  return {
    geometry:
      constructed
        ? ['triangles', 'semicircles', 'rectangles']
        : typographicOnly
          ? []
          : catalogContext?.geometry.length
            ? catalogContext.geometry.map((g) => g.replace(/-/g, ' '))
            : byCategory('geometry'),
    construction:
      constructed
        ? ['modular grid', 'stacked letterforms', 'geometric primitives']
        : typographicOnly
          ? []
          : catalogContext?.construction.length
            ? catalogContext.construction.map((c) => c.replace(/-/g, ' '))
            : byCategory('construction'),
    balance: byCategory('balance'),
    complexity:
      complexityRule?.tags.includes('minimal') || complexityRule?.id.includes('minimal')
        ? 'minimal'
        : complexityRule?.id.includes('medium')
          ? 'medium'
          : 'minimal',
    era: (eraRule?.era?.[0] ?? input.preferredEra ?? 'swiss') as Era,
    typography: byCategory('typography'),
    recognition: 7 + Math.min(principles.filter((p) => p.category === 'mark_type').length, 2),
    minimalism: input.minimalismLevel ?? 8,
    visualWeight: byCategory('balance').length ? byCategory('balance') : ['Optical Balance'],
    harmony: principles.filter((p) => p.tags.includes('harmony')).map((p) => p.name),
  };
}

function buildRecommendations(
  industry: string,
  selected: DesignRule[],
  markType?: LogoMarkType,
): Recommendation[] {
  const selectedIds = new Set(selected.map((p) => p.id));
  const industryRules = resolveIndustryRules(industry);

  const suggestions = searchPrinciples({ industry })
    .filter((p) => !selectedIds.has(p.id) && !p.id.startsWith('ent-'))
    .filter((p) => isPrincipleAllowedForMarkType(p, markType))
    .slice(0, 5);

  if (suggestions.length === 0) {
    const fallbacks =
      markType === 'wordmark' || selected.some((p) => p.category === 'typography')
        ? ['typ-wordmark', 'typ-swiss-typography', 'era-bauhaus', 'cx-minimal-complexity']
        : ['geo-circle', 'comp-negative-space', 'era-bauhaus', 'cx-minimal-complexity'];
    for (const id of fallbacks) {
      const rule = getPrincipleById(id);
      if (rule && !selectedIds.has(id) && isPrincipleAllowedForMarkType(rule, markType)) {
        suggestions.push(rule);
      }
    }
  }

  return suggestions.map((p, i) => ({
    principleId: p.id,
    name: p.name,
    reason: `Recommended for ${industry} based on ${industryRules[0]?.name ?? 'modernist'} principles`,
    confidence: 0.95 - i * 0.08,
  }));
}

export { INSPIRATION_MAP, CATEGORY_ORDER };

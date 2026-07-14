/**
 * Exhaustive brief-build option matrix for Burger company.
 * Covers every selectable enum in steps 1–6 (+ territories).
 *
 * Run: npx tsx packages/design-brain/scripts/audit-burger-matrix.ts
 */
import type { BrainGenerateRequest, CreativeTerritory, LogoMarkType, TypographyStyle } from '@logo-platform/shared';
import {
  buildResolvePromptSpecInput,
  detectActivePromptConflicts,
  resolvePromptSpec,
} from '@logo-platform/shared';
import { compileBrief } from '@logo-platform/brief-compiler';
import { evaluateRequestPromptCompliance } from '../src/reasoning/constraint-gate';

const REFS = {
  cayena: 'ref-import-p78-2-cayena',
  teufels: 'ref-import-p44-7-teufels',
  olivetti: 'ref-olivetti',
  mcdonalds: 'ref-mcdonalds',
  taco: 'ref-import-p66-0-taco-factory',
  nike: 'ref-nike',
} as const;

const MARK_TYPES: LogoMarkType[] = ['wordmark', 'lettermark', 'combination'];
const TYPO_STYLES: TypographyStyle[] = ['standard', 'constructed'];
const PALETTES = ['black_white', 'monochrome', 'two_color', 'limited'] as const;
const SHAPES: Array<{ id: string; geometry: string; preferredShapes: string }> = [
  { id: 'circle', geometry: 'circle construction', preferredShapes: 'circle' },
  { id: 'square', geometry: 'square modular construction', preferredShapes: 'square' },
  { id: 'triangle', geometry: 'angular equilateral triangle', preferredShapes: 'triangle' },
  { id: 'hexagon', geometry: 'hexagon modular construction', preferredShapes: 'hexagon' },
  { id: 'cross', geometry: 'cross compound geometry', preferredShapes: 'cross' },
  { id: 'concentric', geometry: 'concentric rings radial construction', preferredShapes: 'circle' },
  { id: 'arc', geometry: 'quarter arc curve construction', preferredShapes: 'arc' },
  { id: 'organic', geometry: 'organic blob shapes', preferredShapes: 'organic blob' },
  { id: 'monoline', geometry: 'monoline path construction', preferredShapes: 'line' },
  { id: 'diamond', geometry: 'diamond polygon construction', preferredShapes: 'diamond' },
];
const COMPOSITIONS = [
  'Centered Symmetry',
  'Negative Space Figure-Ground',
  'Horizontal Lockup',
  'Stacked Lockup',
  'Dynamic Tension',
  'Overlay Composition',
] as const;
const TERRITORIES: CreativeTerritory['id'][] = [
  'territory-primary',
  'territory-construction',
  'territory-typography',
];
const CLIENT_NOTE_VARIANTS = [
  '',
  'Abstract geometry only.',
  'Stylized industry cue.',
  'Open to designer interpretation.',
  'Modern friendly burger brand. No mascots.',
] as const;

type Variant = { id: string; step: string; request: BrainGenerateRequest; preferTerritory?: CreativeTerritory['id'] };

function base(overrides: Partial<BrainGenerateRequest> = {}): BrainGenerateRequest {
  return {
    industry: 'Food & Beverage',
    companyName: 'Burger company',
    variationCount: 1,
    markType: 'combination',
    typographyStyle: 'standard',
    minimalismLevel: 9,
    preferredEra: '1960s',
    inspirationMode: 'olivetti',
    useBrain: true,
    ...overrides,
    briefContext: {
      allowShadows: false,
      allowPhotoreal: false,
      colorPalette: 'black_white',
      geometry: 'circle construction',
      preferredShapes: 'circle',
      composition: 'Centered Symmetry',
      ...overrides.briefContext,
    },
  };
}

function buildVariants(): Variant[] {
  const out: Variant[] = [];

  // —— 1. Typography: all mark × style ——
  for (const mark of MARK_TYPES) {
    for (const typo of TYPO_STYLES) {
      if (mark === 'wordmark' && typo === 'constructed') {
        // constructed wordmark is valid
      }
      const companyName = mark === 'lettermark' ? 'BC' : 'Burger company';
      out.push({
        id: `s1-${mark}-${typo}`,
        step: '1. Typography',
        request: base({
          companyName,
          markType: mark,
          typographyStyle: typo,
          briefContext: {
            typography: typo === 'constructed' ? 'constructed geometric sans-serif' : 'custom neo-grotesque',
            colorPalette: 'black_white',
            allowShadows: false,
            allowPhotoreal: false,
          },
        }),
        preferTerritory: mark === 'combination' ? 'territory-primary' : 'territory-typography',
      });
    }
  }

  // —— 2. Forms: all 10 primitives ——
  for (const shape of SHAPES) {
    out.push({
      id: `s2-${shape.id}`,
      step: '2. Forms',
      request: base({
        catalogReferenceIds: [REFS.cayena],
        briefContext: {
          geometry: shape.geometry,
          preferredShapes: shape.preferredShapes,
          composition: 'Centered Symmetry',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
        },
      }),
      preferTerritory: 'territory-construction',
    });
  }

  // —— 3. Style: all palettes × compositions ——
  for (const palette of PALETTES) {
    for (const composition of COMPOSITIONS) {
      out.push({
        id: `s3-${palette}-${composition.toLowerCase().replace(/\s+/g, '-')}`,
        step: '3. Style',
        request: base({
          briefContext: {
            geometry: 'circle construction',
            preferredShapes: 'circle',
            colorPalette: palette,
            composition,
            allowShadows: false,
            allowPhotoreal: false,
          },
        }),
        preferTerritory: 'territory-primary',
      });
    }
  }

  // —— 4. References: all refs × mark types × territories ——
  const refCases: Array<{ key: string; ids: string[] }> = [
    { key: 'olivetti', ids: [REFS.olivetti] },
    { key: 'cayena', ids: [REFS.cayena] },
    { key: 'teufels', ids: [REFS.teufels] },
    { key: 'mcdonalds', ids: [REFS.mcdonalds] },
    { key: 'taco', ids: [REFS.taco] },
    { key: 'nike', ids: [REFS.nike] },
    { key: 'dual-food', ids: [REFS.cayena, REFS.teufels] },
    { key: 'dual-olivetti-cayena', ids: [REFS.olivetti, REFS.cayena] },
  ];
  for (const ref of refCases) {
    for (const mark of MARK_TYPES) {
      for (const territory of TERRITORIES) {
        out.push({
          id: `s4-${ref.key}-${mark}-${territory.replace('territory-', '')}`,
          step: '4. References',
          request: base({
            companyName: mark === 'lettermark' ? 'BC' : 'Burger company',
            markType: mark,
            catalogReferenceIds: ref.ids,
            briefContext: {
              geometry: 'circle, square',
              preferredShapes: 'circle',
              colorPalette: 'black_white',
              composition: 'Centered Symmetry',
              allowShadows: false,
              allowPhotoreal: false,
            },
          }),
          preferTerritory: territory,
        });
      }
    }
  }

  // —— 5. Client brief note variants × refs ——
  for (const notes of CLIENT_NOTE_VARIANTS) {
    out.push({
      id: `s5-notes-${notes.slice(0, 18).replace(/\W+/g, '-') || 'empty'}`,
      step: '5. Client brief',
      request: base({
        catalogReferenceIds: [REFS.cayena],
        briefContext: {
          geometry: 'circle',
          preferredShapes: 'circle',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
          clientNotes: notes || undefined,
          constraints: notes.includes('No mascots') ? 'No mascots. No literal burgers.' : undefined,
        },
      }),
      preferTerritory: 'territory-primary',
    });
  }

  // —— 6. Brief analysis outcomes ——
  const analysisCases: Array<{ id: string; patch: Partial<BrainGenerateRequest> }> = [
    {
      id: 'geometry-axis-geometric',
      patch: {
        briefContext: {
          geometry: 'Geometric circles and quarter arcs',
          preferredShapes: 'circle',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
        },
      },
    },
    {
      id: 'geometry-axis-organic',
      patch: {
        briefContext: {
          geometry: 'Organic blob shapes',
          preferredShapes: 'organic blob',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
        },
      },
    },
    {
      id: 'forbidden-motifs',
      patch: {
        catalogReferenceIds: [REFS.teufels],
        briefContext: {
          geometry: 'circle',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
          constraints: 'Avoid: literal burger illustrations, look cheap, stock clipart, mascots.',
        },
      },
    },
    {
      id: 'desired-abstract',
      patch: {
        briefContext: {
          geometry: 'circle',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
          clientNotes: 'Abstract geometry only.',
        },
      },
    },
    {
      id: 'desired-stylized',
      patch: {
        briefContext: {
          geometry: 'circle',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
          clientNotes: 'Stylized industry cue.',
        },
      },
    },
    {
      id: 'color-from-interview-bw',
      patch: { briefContext: { colorPalette: 'black_white', geometry: 'circle', allowShadows: false, allowPhotoreal: false } },
    },
    {
      id: 'color-from-interview-mono',
      patch: { briefContext: { colorPalette: 'monochrome', geometry: 'circle', allowShadows: false, allowPhotoreal: false } },
    },
    {
      id: 'color-from-interview-two',
      patch: { briefContext: { colorPalette: 'two_color', geometry: 'circle', allowShadows: false, allowPhotoreal: false } },
    },
    {
      id: 'color-from-interview-limited',
      patch: { briefContext: { colorPalette: 'limited', geometry: 'circle', allowShadows: false, allowPhotoreal: false } },
    },
    {
      id: 'mark-from-interview-wordmark',
      patch: {
        markType: 'wordmark',
        briefContext: { colorPalette: 'black_white', typography: 'wordmark', allowShadows: false, allowPhotoreal: false },
      },
    },
    {
      id: 'mark-from-interview-lettermark',
      patch: {
        companyName: 'BC',
        markType: 'lettermark',
        briefContext: { colorPalette: 'black_white', allowShadows: false, allowPhotoreal: false },
      },
    },
    {
      id: 'mark-from-interview-combination',
      patch: {
        markType: 'combination',
        catalogReferenceIds: [REFS.olivetti, REFS.cayena],
        briefContext: {
          geometry: 'circle',
          colorPalette: 'black_white',
          allowShadows: false,
          allowPhotoreal: false,
          clientNotes: 'Friendly modern food brand',
          constraints: 'No photorealism. No mascots.',
        },
      },
    },
  ];
  for (const c of analysisCases) {
    out.push({
      id: `s6-${c.id}`,
      step: '6. Brief analysis',
      request: base(c.patch),
      preferTerritory: 'territory-primary',
    });
  }

  // —— Geometry score dump leak (UI path) ——
  out.push({
    id: 'sx-geometry-score-narrative',
    step: 'X. Geometry narrative poison',
    request: base({
      catalogReferenceIds: [REFS.mcdonalds],
      catalogNarrative:
        'Circle (6/10): General geometric foundation. Equilateral Triangle (6/10): General geometric foundation. Organic Blob (6/10): General geometric foundation',
      briefContext: {
        geometry: 'quarter arcs and circles',
        preferredShapes: 'circle',
        colorPalette: 'black_white',
        composition: 'Centered Symmetry',
        allowShadows: false,
        allowPhotoreal: false,
        narrative:
          'Circle (6/10): General geometric foundation. Equilateral Triangle (6/10): General geometric foundation',
      },
    }),
    preferTerritory: 'territory-primary',
  });

  // —— Incomplete UI like screenshot: typo waiting, others ready ——
  out.push({
    id: 'sx-incomplete-ui',
    step: 'X. Incomplete UI',
    request: base({
      catalogReferenceIds: [REFS.olivetti, REFS.cayena],
      briefContext: {
        geometry: 'circle construction, circular modular grid',
        preferredShapes: 'circle',
        composition: 'Centered Symmetry',
        colorPalette: 'black_white',
        allowShadows: false,
        allowPhotoreal: false,
        clientNotes: 'Friendly modern food brand',
      },
    }),
    preferTerritory: 'territory-primary',
  });

  return out;
}

const WEAK: Array<{
  id: string;
  re: RegExp;
  severity: 'error' | 'warn';
  onlyIf?: (r: BrainGenerateRequest, text: string) => boolean;
}> = [
  { id: 'catalog_reference_leak', re: /Catalog reference\s*[—-]/i, severity: 'error' },
  { id: 'golden_arches', re: /golden arches/i, severity: 'error' },
  { id: 'geometry_score_dump', re: /\(\d{1,2}\s*\/\s*10\)|general geometric foundation/i, severity: 'error' },
  { id: 'interlocking_cs', re: /interlocking\s*c'?s|contour-only luxury treatment/i, severity: 'error' },
  { id: 'as_brand_symbol', re: /\bas brand symbol\b/i, severity: 'error' },
  { id: 'mark_type_symbol', re: /Mark [Tt]ype:\s*(?:iconic memorable symbol|abstract geometric symbol|(?<!combination\s)symbol)\b/i, severity: 'error' },
  { id: 'hexagonal_junk', re: /hexagonal tiling grid/i, severity: 'error' },
  {
    id: 'warm_vs_bw',
    re: /warm color palette/i,
    severity: 'error',
    onlyIf: (r) => r.briefContext?.colorPalette === 'black_white' || r.briefContext?.colorPalette === 'monochrome',
  },
  {
    id: 'bw_in_multi',
    re: /Color:\s*strict black and white only/i,
    severity: 'error',
    onlyIf: (r) => r.briefContext?.colorPalette === 'two_color' || r.briefContext?.colorPalette === 'limited',
  },
  { id: 'look_cheap', re: /\blook cheap\b/i, severity: 'error' },
  { id: 'hungry_feel', re: /make people feel hungry/i, severity: 'error' },
  { id: 'literal_burger', re: /\bstylized burger\b|\bburger symbol\b|\bburger element\b/i, severity: 'error' },
  { id: 'food_fluff', re: /playful and inviting nature of the food industry/i, severity: 'error' },
  { id: 'missing_territory', re: /Territory emphasis:/i, severity: 'warn' },
  { id: 'double_client_prefs', re: /Client preferences:[\s\S]*Client preferences:/i, severity: 'error' },
  { id: 'empty_client_prefs', re: /Client preferences:\s*\./i, severity: 'error' },
];

function compileVariant(request: BrainGenerateRequest, preferTerritory?: CreativeTerritory['id']): string {
  const compiled = compileBrief({
    ...request,
    variationCount: 1,
    preferredTerritoryId: preferTerritory,
  });
  if (!compiled.validation.passed) {
    throw new Error(compiled.validation.violations.join('; '));
  }
  return compiled.prompts[0]!.positive;
}

function score(text: string, request: BrainGenerateRequest) {
  const hits: Array<{ id: string; severity: string }> = [];
  for (const p of WEAK) {
    if (p.id === 'missing_territory') {
      if (!p.re.test(text)) hits.push({ id: p.id, severity: 'error' });
      continue;
    }
    if (p.onlyIf && !p.onlyIf(request, text)) continue;
    if (p.re.test(text)) hits.push({ id: p.id, severity: p.severity });
  }
  return hits;
}

function main() {
  const variants = buildVariants();
  const byStep = new Map<string, { pass: number; fail: number; warn: number; errors: Map<string, number> }>();
  let pass = 0;
  let passStar = 0;
  let fail = 0;
  const failures: string[] = [];

  console.log(`\nRunning ${variants.length} variants across all brief-build options…\n`);

  for (const v of variants) {
    const finalText = compileVariant(v.request, v.preferTerritory);
    const weak = score(finalText, v.request);
    const spec = resolvePromptSpec(buildResolvePromptSpecInput(v.request));
    const conflicts = detectActivePromptConflicts(finalText, spec).filter((c) => c.severity === 'error');
    const gate = evaluateRequestPromptCompliance(
      {
        id: 'audit',
        text: finalText,
        industry: v.request.industry,
        selectedPrinciples: [],
        scores: {
          modernismScore: 9,
          swissScore: 9,
          minimalismScore: 9,
          geometryScore: 9,
          readabilityScore: 9,
          scalabilityScore: 9,
          brandRecognitionScore: 9,
          cohesionScore: 9,
          identityScore: 9,
          promptQuality: 9,
        },
        dna: {
          geometry: [],
          construction: [],
          balance: [],
          complexity: 'minimal',
          era: 'swiss',
          typography: [],
          recognition: 8,
          minimalism: 9,
          visualWeight: ['medium'],
          harmony: ['geometric'],
        },
        metadata: { era: 'swiss', markType: v.request.markType },
      },
      v.request,
    ).violations.filter((x) => x.severity === 'error');

    const errors = [
      ...weak.filter((w) => w.severity === 'error').map((w) => w.id),
      ...conflicts.map((c) => `conflict:${c.code}`),
      ...gate.map((g) => `gate:${g.code}`),
    ];
    const warns = weak.filter((w) => w.severity === 'warn').map((w) => w.id);
    const grade = errors.length ? 'FAIL' : warns.length ? 'PASS*' : 'PASS';

    if (grade === 'PASS') pass++;
    else if (grade === 'PASS*') passStar++;
    else {
      fail++;
      failures.push(`${v.id}: ${errors.join(',')}`);
    }

    const stats = byStep.get(v.step) ?? { pass: 0, fail: 0, warn: 0, errors: new Map() };
    if (grade === 'PASS') stats.pass++;
    else if (grade === 'PASS*') stats.warn++;
    else stats.fail++;
    for (const e of errors) stats.errors.set(e, (stats.errors.get(e) ?? 0) + 1);
    byStep.set(v.step, stats);
  }

  console.log('======== BY BRIEF STEP ========');
  for (const [step, s] of byStep) {
    const errTop = [...s.errors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `${k}×${n}`)
      .join(', ');
    console.log(
      `${step}: PASS=${s.pass} PASS*=${s.warn} FAIL=${s.fail}` + (errTop ? ` | ${errTop}` : ''),
    );
  }

  if (failures.length) {
    console.log('\n======== FAILURES (first 40) ========');
    for (const f of failures.slice(0, 40)) console.log(' ', f);
  }

  // Spot-check key prompts
  console.log('\n======== SPOT CHECKS ========');
  for (const id of ['s1-combination-standard', 's2-organic', 's3-two_color-centered-symmetry', 's4-mcdonalds-combination-primary', 's6-forbidden-motifs']) {
    const v = variants.find((x) => x.id === id);
    if (!v) continue;
    const basePrompt = buildBasePromptFromRules(v.request);
    const territory = fakeTerritory(v.preferTerritory ?? 'territory-primary', v.request);
    const finalText = applyTerritory(basePrompt.text, territory, v.request);
    console.log(`\n--- ${id} ---\n${finalText.slice(0, 320)}…\n`);
  }

  console.log('\n======== SUMMARY ========');
  console.log(`variants=${variants.length} PASS=${pass} PASS*=${passStar} FAIL=${fail}`);
  console.log(`coverage: typography=${MARK_TYPES.length}*${TYPO_STYLES.length} shapes=${SHAPES.length} palettes=${PALETTES.length}*comps=${COMPOSITIONS.length} refs=${refCount(variants)} analysis+client included`);
  console.log(`\nVERDICT: ${fail === 0 ? (passStar ? 'READY_WITH_MINOR_WARNS' : 'READY') : 'NEEDS_FIX'}`);
}

function refCount(variants: Variant[]): number {
  return variants.filter((v) => v.step === '4. References').length;
}

main();

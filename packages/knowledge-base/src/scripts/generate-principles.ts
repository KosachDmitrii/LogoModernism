/**
 * One-time seed script: generates structured design principles
 * from modernist logo design knowledge (NOT from copyrighted book text).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DesignRule, KnowledgeGraphEdge, LogoReference, PromptTemplate } from '@logo-platform/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');

function rule(
  partial: Omit<DesignRule, 'weight'> & { weight?: number },
): DesignRule {
  return {
    weight: 1,
    compatibility: [],
    antiPatterns: [],
    examples: [],
    tags: [],
    ...partial,
  };
}

function buildPrinciples(): DesignRule[] {
  const principles: DesignRule[] = [];

  const geometries = [
    ['circle', 'Circle Construction', 'Primary form built from perfect circles and arcs', 'circle', ['modular-grid', 'negative-space', 'symmetry']],
    ['square', 'Square Construction', 'Rectilinear form from squares and right angles', 'square', ['grid-based', 'modular-grid', 'symmetry']],
    ['triangle', 'Triangle Construction', 'Angular form from triangles and dihedral symmetry', 'triangle', ['dynamic-composition', 'optical-balance']],
    ['hexagon', 'Hexagon Construction', 'Six-sided modular geometry', 'hexagon', ['modular-grid', 'corporate-mark']],
    ['pentagon', 'Pentagon Construction', 'Five-sided geometric foundation', 'pentagon', ['golden-ratio']],
    ['diamond', 'Diamond Construction', 'Rhombus-based angular mark', 'diamond', ['rotation', 'symmetry']],
    ['ellipse', 'Ellipse Construction', 'Oval and elliptical curves', 'ellipse', ['optical-balance', 'organic-soft']],
    ['cross', 'Cross Construction', 'Intersecting perpendicular axes', 'cross', ['symmetry', 'grid-based']],
    ['star', 'Star Construction', 'Radial pointed geometry', 'star', ['radial-grid', 'rotation']],
    ['organic-round', 'Organic Round Geometry', 'Soft curved non-geometric forms', 'organic', ['negative-space', '1960s-corporate']],
    ['linear', 'Linear Geometry', 'Dominantly line-based construction', 'line', ['equal-stroke', 'parallel-lines']],
    ['angular', 'Angular Geometry', 'Sharp corners and acute angles', 'angular', ['bauhaus', 'dynamic-composition']],
    ['concentric', 'Concentric Form', 'Nested circular or square rings', 'concentric', ['radial-grid', 'single-color']],
    ['interlocking', 'Interlocking Forms', 'Overlapping geometric modules', 'interlock', ['modular-grid', 'negative-space']],
    ['fragmented', 'Fragmented Geometry', 'Broken modular segments', 'fragment', ['dynamic-composition', 'medium-complexity']],
  ];

  for (const [id, name, desc, tag, compat] of geometries) {
    principles.push(
      rule({
        id: `geo-${id}`,
        name,
        category: 'geometry',
        description: desc,
        promptFragment: `built from ${name.toLowerCase()}`,
        tags: [tag, 'geometry'],
        compatibility: compat.map((c) => `geo-${c}`).filter(() => false).concat(compat),
        examples: [`${name} in corporate identity`],
      }),
    );
  }

  const constructions = [
    ['grid-based', 'Grid Based', 'Aligned to orthogonal construction grid', 'constructed on a precise modular grid', ['modular-grid', 'symmetry']],
    ['radial-grid', 'Radial Grid', 'Radial construction from center point', 'built on radial grid system', ['circle', 'rotation']],
    ['golden-ratio', 'Golden Ratio', 'Proportions based on golden section', 'golden ratio proportions', ['optical-balance', 'harmony']],
    ['modular-grid', 'Modular Grid', 'Repeating modular units', 'modular grid construction', ['grid-based', 'corporate-mark']],
    ['concentric-circles', 'Concentric Circles', 'Nested circular modules', 'concentric circle construction', ['circle', 'radial-grid']],
    ['equal-width-lines', 'Equal Width Lines', 'Uniform stroke throughout', 'equal width parallel lines', ['linear', 'swiss']],
    ['parallel-lines', 'Parallel Lines', 'Parallel line rhythm', 'parallel line construction', ['equal-width-lines', 'swiss']],
    ['rounded-corners', 'Rounded Corners', 'Softened rectilinear corners', 'subtly rounded corners', ['square', 'friendly']],
    ['45-degree', '45 Degree Angles', 'Diagonal at 45 degrees', '45-degree diagonal construction', ['dynamic-composition', 'angular']],
    ['isometric', 'Isometric Construction', '30-degree isometric axes', 'isometric grid construction', ['technical', 'medium-complexity']],
    ['baseline-grid', 'Baseline Grid', 'Typography aligned to baseline', 'baseline grid alignment', ['wordmark', 'swiss-typography']],
    ['circle-in-square', 'Circle in Square', 'Circle inscribed in square module', 'circle inscribed in square', ['modular-grid', 'bauhaus']],
    ['square-in-circle', 'Square in Circle', 'Square contained within circle', 'square within circle module', ['modular-grid']],
    ['diagonal-split', 'Diagonal Split', 'Form divided on diagonal axis', 'diagonal bisection', ['dynamic-composition']],
    ['quarter-circle', 'Quarter Circle', '90-degree arc modules', 'quarter-circle modules', ['modular-grid', 'rounded']],
    ['continuous-line', 'Continuous Line', 'Unbroken single path', 'continuous unbroken line', ['single-stroke', 'minimal']],
    ['modular-repetition', 'Modular Repetition', 'Repeated identical modules', 'repeated modular units', ['modular-grid']],
    ['optical-correction', 'Optical Correction', 'Geometric correction for perception', 'optically corrected geometry', ['optical-balance']],
    ['stroke-to-fill', 'Stroke to Fill', 'Line weight becomes solid form', 'stroke-weight defining solid forms', ['equal-width-lines']],
    ['tangent-curves', 'Tangent Curves', 'Smoothly connected curve tangents', 'tangent curve connections', ['circle', 'precision']],
  ];

  for (const [id, name, desc, fragment, compat] of constructions) {
    principles.push(
      rule({
        id: `con-${id}`,
        name,
        category: 'construction',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'construction'],
        compatibility: compat,
        examples: [name],
      }),
    );
  }

  const compositions = [
    ['symmetry', 'Symmetry', 'Bilateral or radial symmetry', 'perfect symmetry', ['mirror', 'balance']],
    ['mirror', 'Mirror', 'Mirrored axis reflection', 'mirror symmetry axis', ['symmetry']],
    ['rotation', 'Rotation', 'Rotational symmetry or turned elements', 'rotational symmetry', ['dynamic-composition']],
    ['negative-space', 'Negative Space', 'Meaningful void shapes', 'clever negative space', ['minimal', 'recognition']],
    ['positive-space', 'Positive Space', 'Dominant filled forms', 'strong positive space', ['solid-fill']],
    ['reflection', 'Reflection', 'Reflected duplicate forms', 'reflected form', ['symmetry']],
    ['overlay', 'Overlay', 'Transparent overlapping layers', 'overlapping transparent forms', ['two-color']],
    ['duplication', 'Duplication', 'Repeated identical elements', 'duplicated modular elements', ['modular-repetition']],
    ['outline', 'Outline', 'Stroke-only construction', 'outline only no fill', ['single-stroke']],
    ['solid-fill', 'Solid Fill', 'Filled solid shapes', 'solid fill shapes', ['single-color']],
    ['figure-ground', 'Figure Ground', 'Interchangeable figure and ground', 'figure-ground reversal', ['negative-space']],
    ['centralized', 'Centralized', 'Centered focal composition', 'centrally composed', ['symmetry', 'corporate']],
    ['asymmetric-balance', 'Asymmetric Balance', 'Balanced without symmetry', 'asymmetrically balanced', ['optical-balance']],
    ['stacked', 'Stacked', 'Vertically stacked elements', 'vertically stacked composition', ['wordmark']],
    ['nested', 'Nested', 'Forms within forms', 'nested geometric forms', ['concentric']],
    ['interwoven', 'Interwoven', 'Interlaced paths', 'interwoven line paths', ['continuous-line']],
    ['counter-change', 'Counter Change', 'Alternating positive negative', 'counter-change pattern', ['negative-space']],
    ['knockout', 'Knockout', 'Cut-out letterforms', 'knockout letterforms', ['wordmark', 'negative-space']],
    ['containment', 'Containment', 'Element enclosed in shape', 'contained within geometric frame', ['circle', 'square']],
    ['dynamic-tension', 'Dynamic Tension', 'Diagonal energy and movement', 'dynamic diagonal tension', ['angular', 'medium-complexity']],
  ];

  for (const [id, name, desc, fragment, compat] of compositions) {
    principles.push(
      rule({
        id: `comp-${id}`,
        name,
        category: 'composition',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'composition'],
        compatibility: compat,
      }),
    );
  }

  const typography = [
    ['swiss-typography', 'Swiss Typography', 'Helvetica-era Swiss style', 'Swiss International typography', ['swiss', 'helvetica-style'], 'swiss'],
    ['helvetica-style', 'Helvetica Style', 'Neo-grotesque sans-serif', 'Helvetica-style neo-grotesque', ['swiss-typography', 'corporate']],
    ['univers-style', 'Univers Style', 'Systematic grotesque family', 'Univers-style systematic type', ['swiss-typography']],
    ['bauhaus-typography', 'Bauhaus Typography', 'Geometric Bauhaus letterforms', 'Bauhaus geometric typography', ['bauhaus']],
    ['monogram', 'Monogram', 'Interlocked initials', 'elegant monogram', ['letter-combination', 'minimal']],
    ['letter-combination', 'Letter Combination', 'Merged letterforms', 'combined letterforms', ['monogram']],
    ['initials', 'Initials', 'Standalone initial letters', 'bold initials', ['monogram']],
    ['wordmark', 'Wordmark', 'Typographic logotype', 'custom wordmark typography', ['baseline-grid']],
    ['sans-serif', 'Sans Serif', 'Clean sans-serif type', 'clean sans-serif letterforms', ['swiss']],
    ['geometric-sans', 'Geometric Sans', 'Pure geometric sans', 'geometric sans-serif', ['bauhaus']],
    ['condensed', 'Condensed Type', 'Narrow compressed forms', 'condensed letterforms', ['corporate']],
    ['extended', 'Extended Type', 'Wide letterforms', 'extended wide letterforms', ['corporate']],
    ['all-caps', 'All Caps', 'Uppercase only', 'all-caps lettering', ['corporate', 'authority']],
    ['mixed-case', 'Mixed Case', 'Upper and lower case', 'mixed case typography', ['approachable']],
    ['ligature', 'Ligature', 'Connected letter joins', 'custom typographic ligature', ['wordmark']],
    ['letter-spacing', 'Wide Letter Spacing', 'Generous tracking', 'wide letter spacing', ['luxury', 'swiss']],
    ['tight-kerning', 'Tight Kerning', 'Close letter spacing', 'tight kerning', ['bold', 'compact']],
    ['baseline-alignment', 'Baseline Alignment', 'Strict baseline alignment', 'baseline-aligned typography', ['grid-based']],
    ['custom-letterform', 'Custom Letterform', 'Modified unique glyphs', 'custom modified letterforms', ['recognition']],
    ['stacked-type', 'Stacked Type', 'Multi-line typographic lockup', 'stacked typographic lockup', ['wordmark']],
  ];

  for (const [id, name, desc, fragment, compat, era] of typography) {
    principles.push(
      rule({
        id: `typ-${id}`,
        name,
        category: 'typography',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'typography'],
        compatibility: compat,
        era: era ? [era as never] : undefined,
      }),
    );
  }

  const strokes = [
    ['continuous-line', 'Continuous Line', 'Unbroken path', 'continuous single line'],
    ['broken-line', 'Broken Line', 'Segmented path', 'broken segmented lines'],
    ['single-stroke', 'Single Stroke', 'One uniform stroke weight', 'single uniform stroke'],
    ['dual-stroke', 'Dual Stroke', 'Two stroke weights', 'dual stroke weights'],
    ['variable-stroke', 'Variable Stroke', 'Changing stroke width', 'variable stroke width'],
    ['hairline', 'Hairline', 'Ultra-thin stroke', 'hairline thin strokes'],
    ['bold-stroke', 'Bold Stroke', 'Heavy stroke weight', 'bold heavy strokes'],
    ['rounded-cap', 'Rounded Cap', 'Rounded line endings', 'rounded line caps'],
    ['square-cap', 'Square Cap', 'Square line endings', 'square line caps'],
    ['miter-join', 'Miter Join', 'Sharp corner joins', 'miter corner joins'],
  ];

  for (const [id, name, desc, fragment] of strokes) {
    principles.push(
      rule({
        id: `stroke-${id}`,
        name,
        category: 'stroke',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'stroke'],
        compatibility: ['linear', 'outline'],
      }),
    );
  }

  const colors = [
    ['one-color', 'One Color', 'Single color mark', 'single color only', [], ['gradient', 'multi-color']],
    ['two-color', 'Two Color', 'Two-color palette', 'two-color palette', [], ['gradient']],
    ['no-gradient', 'No Gradient', 'Flat color only', 'no gradients', [], ['gradient', 'shadow']],
    ['pure-black', 'Pure Black', 'Black on white', 'pure black on white', [], ['color']],
    ['pure-white', 'Pure White', 'White on dark', 'pure white reversed', [], []],
    ['red-accent', 'Red Accent', 'Red as accent color', 'red accent color', [], []],
    ['blue-corporate', 'Blue Corporate', 'Corporate blue', 'corporate blue', ['corporate'], []],
    ['monochrome', 'Monochrome', 'Grayscale only', 'monochrome grayscale', [], ['color']],
    ['high-contrast', 'High Contrast', 'Maximum contrast', 'high contrast black and white', [], []],
    ['limited-palette', 'Limited Palette', 'Restricted color count', 'limited color palette', [], ['rainbow']],
  ];

  for (const [id, name, desc, fragment, compat, anti] of colors) {
    principles.push(
      rule({
        id: `color-${id}`,
        name,
        category: 'color',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'color'],
        compatibility: compat,
        antiPatterns: anti,
      }),
    );
  }

  const markTypes = [
    ['abstract-symbol', 'Abstract Symbol', 'Non-literal abstract mark', 'abstract geometric symbol'],
    ['pictogram', 'Pictogram', 'Simplified representational icon', 'simplified pictogram'],
    ['iconic-symbol', 'Iconic Symbol', 'Highly recognizable symbol', 'iconic memorable symbol'],
    ['corporate-mark', 'Corporate Mark', 'Enterprise identity mark', 'corporate identity mark'],
    ['emblem', 'Emblem', 'Badge-style enclosed mark', 'emblem badge format'],
    ['lettermark', 'Lettermark', 'Single letter dominant', 'bold lettermark'],
    ['combination-mark', 'Combination Mark', 'Symbol plus wordmark', 'symbol and wordmark combination'],
    ['symbol-only', 'Symbol Only', 'Standalone symbol', 'standalone symbol mark'],
    ['dynamic-mark', 'Dynamic Mark', 'Variable or animated potential', 'dynamic adaptable mark'],
    ['heraldic', 'Heraldic', 'Shield or crest form', 'heraldic shield form'],
  ];

  for (const [id, name, desc, fragment] of markTypes) {
    principles.push(
      rule({
        id: `mark-${id}`,
        name,
        category: 'mark_type',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'mark'],
      }),
    );
  }

  const eras = [
    ['swiss', 'Swiss Modernism', 'Swiss International Style', 'Swiss Modernism International Style', 'swiss'],
    ['bauhaus', 'Bauhaus', 'Bauhaus design principles', 'Bauhaus design principles', 'bauhaus'],
    ['international-style', 'International Style', 'Mid-century International Style', 'International Typographic Style', 'international_style'],
    ['corporate-identity', 'Corporate Identity', '1960s corporate identity systems', '1960s corporate identity', 'corporate_identity'],
    ['1960s', '1960s Era', 'Mid-1960s design language', 'timeless 1965 corporate identity', '1960s'],
    ['1970s', '1970s Era', 'Early 1970s systematic design', '1970s systematic design', '1970s'],
    ['mid-century', 'Mid Century', 'Mid-century modern aesthetic', 'mid-century modern aesthetic', 'mid_century'],
  ];

  for (const [id, name, desc, fragment, era] of eras) {
    principles.push(
      rule({
        id: `era-${id}`,
        name,
        category: 'era',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'era'],
        era: [era as never],
        weight: 1.2,
      }),
    );
  }

  const balance = [
    ['optical-balance', 'Optical Balance', 'Perceptually balanced forms', 'optically balanced'],
    ['visual-weight', 'Visual Weight', 'Deliberate visual mass distribution', 'balanced visual weight'],
    ['harmony', 'Harmony', 'Unified proportional relationships', 'harmonious proportions'],
    ['counterbalance', 'Counterbalance', 'Offset elements for balance', 'counterbalanced composition'],
    ['center-of-mass', 'Center of Mass', 'Centered visual gravity', 'centered visual mass'],
    ['white-space-balance', 'White Space Balance', 'Balanced empty space', 'balanced white space'],
  ];

  for (const [id, name, desc, fragment] of balance) {
    principles.push(
      rule({
        id: `bal-${id}`,
        name,
        category: 'balance',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'balance'],
      }),
    );
  }

  const complexity = [
    ['minimal-complexity', 'Minimal Complexity', 'Extremely simple forms', 'minimal complexity', 0.9],
    ['medium-complexity', 'Medium Complexity', 'Moderate detail level', 'medium complexity', 0.7],
    ['high-simplicity', 'High Simplicity', 'Radical reduction', 'radically simplified', 1.0],
    ['reductive', 'Reductive Design', 'Stripped to essentials', 'reductive essential forms', 0.95],
    ['dense', 'Dense Composition', 'Rich detail within constraints', 'dense but controlled detail', 0.5],
  ];

  for (const [id, name, desc, fragment, weight] of complexity) {
    principles.push(
      rule({
        id: `cx-${id}`,
        name,
        category: 'complexity',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'complexity'],
        weight: weight as number,
      }),
    );
  }

  const rendering = [
    ['flat-vector', 'Flat Vector', 'Clean vector flat design', 'flat vector illustration'],
    ['no-shadows', 'No Shadows', 'No drop shadows', 'no shadows no depth effects'],
    ['no-textures', 'No Textures', 'No surface textures', 'no textures or grain'],
    ['crisp-edges', 'Crisp Edges', 'Sharp clean edges', 'crisp clean edges'],
    ['scalable', 'Scalable', 'Works at any size', 'infinitely scalable'],
    ['print-ready', 'Print Ready', 'Suitable for print reproduction', 'print-ready reproduction'],
    ['screen-optimized', 'Screen Optimized', 'Optimized for digital display', 'screen-optimized clarity'],
    ['timeless', 'Timeless', 'Avoids trendy effects', 'timeless enduring design'],
    ['premium', 'Premium', 'High-end professional quality', 'premium professional branding'],
    ['professional', 'Professional Branding', 'Agency-quality output', 'professional branding quality'],
  ];

  for (const [id, name, desc, fragment] of rendering) {
    principles.push(
      rule({
        id: `render-${id}`,
        name,
        category: 'rendering',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'rendering'],
        weight: 0.8,
      }),
    );
  }

  const industries = [
    ['tech', 'Technology', 'AI, software, digital', 'technology company', ['geo-circle', 'mark-abstract-symbol', 'era-swiss']],
    ['finance', 'Finance', 'Banking, investment, fintech', 'financial services', ['geo-square', 'typ-all-caps', 'era-corporate-identity']],
    ['medical', 'Medical', 'Healthcare, pharma', 'medical healthcare', ['geo-cross', 'color-blue-corporate', 'comp-symmetry']],
    ['luxury', 'Luxury', 'Premium brands', 'luxury brand', ['typ-letter-spacing', 'color-one-color', 'cx-high-simplicity']],
    ['coffee', 'Coffee Shop', 'Café, roastery', 'coffee shop café', ['geo-organic-round', 'comp-negative-space', 'era-1960s']],
    ['ai', 'AI Company', 'Artificial intelligence', 'AI technology company', ['geo-hexagon', 'mark-abstract-symbol', 'con-modular-grid']],
    ['aviation', 'Aviation', 'Airlines, aerospace', 'aviation aerospace', ['geo-triangle', 'comp-dynamic-tension', 'era-international-style']],
    ['media', 'Media', 'Broadcast, entertainment', 'media broadcast', ['geo-circle', 'comp-bold', 'mark-iconic-symbol']],
    ['retail', 'Retail', 'Consumer retail', 'retail consumer', ['mark-combination-mark', 'typ-sans-serif']],
    ['education', 'Education', 'Schools, learning', 'education institution', ['geo-book', 'comp-centralized']],
    ['energy', 'Energy', 'Power, utilities', 'energy utilities', ['geo-lightning', 'color-two-color']],
    ['legal', 'Legal', 'Law firms', 'legal professional', ['typ-serif-classic', 'color-pure-black', 'comp-symmetry']],
    ['food', 'Food & Beverage', 'Restaurant, food brands', 'food beverage brand', ['geo-organic-round', 'comp-warm']],
    ['architecture', 'Architecture', 'Design studios', 'architecture design', ['con-grid-based', 'geo-angular', 'era-bauhaus']],
    ['automotive', 'Automotive', 'Cars, transport', 'automotive transport', ['comp-dynamic-tension', 'geo-angular']],
  ];

  for (const [id, name, desc, fragment, compat] of industries) {
    principles.push(
      rule({
        id: `ind-${id}`,
        name,
        category: 'industry',
        description: `Design approach for ${desc}`,
        promptFragment: fragment,
        tags: [id, 'industry', name.toLowerCase()],
        industries: [desc, id],
        compatibility: compat,
        weight: 1.1,
      }),
    );
  }

  const inspirations = [
    ['ibm', 'IBM Principles', 'Grid-based corporate systematic design', 'systematic grid corporate design', 'ibm'],
    ['nasa', 'NASA Principles', 'Bold iconic aerospace symbolism', 'bold iconic aerospace symbolism', 'nasa'],
    ['lufthansa', 'Lufthansa Principles', 'Aviation circle crane elegance', 'aviation circle elegance', 'lufthansa'],
    ['braun', 'Braun Principles', 'Functional minimal product design', 'functional Dieter Rams minimalism', 'braun'],
    ['cbs', 'CBS Principles', 'Eye iconic broadcast symbol', 'iconic eye broadcast symbol', 'cbs'],
    ['abc', 'ABC Principles', 'Circular broadcast identity', 'circular broadcast identity', 'abc'],
    ['olivetti', 'Olivetti Principles', 'Playful modernist corporate', 'playful modernist corporate', 'olivetti'],
    ['westinghouse', 'Westinghouse Principles', 'Industrial circular mark', 'industrial circular mark', 'westinghouse'],
  ];

  for (const [id, name, desc, fragment, mode] of inspirations) {
    principles.push(
      rule({
        id: `insp-${id}`,
        name,
        category: 'inspiration',
        description: `${desc} — principles only, not copying`,
        promptFragment: fragment,
        tags: [id, 'inspiration', mode],
        antiPatterns: ['copy', 'replica', 'imitation'],
        weight: 0.9,
      }),
    );
  }

  const effects = [
    ['knockout-effect', 'Knockout Effect', 'Cut-through letterforms', 'knockout cut-through effect'],
    ['intersection', 'Intersection', 'Overlapping form intersection', 'geometric intersection'],
    ['subtraction', 'Subtraction', 'Subtractive form carving', 'subtractive form carving'],
    ['union', 'Union', 'Additive form union', 'unified additive forms'],
    ['perspective', 'Flat Perspective', 'Flat pseudo-3D without depth', 'flat pseudo-perspective'],
    ['halftone-avoid', 'No Halftone', 'Avoid halftone patterns', 'no halftone patterns'],
    ['gradient-avoid', 'No Gradient', 'Strictly flat fills', 'strictly flat color fills'],
    ['shadow-avoid', 'No Shadow', 'No dimensional shadows', 'no dimensional shadows'],
    ['bevel-avoid', 'No Bevel', 'No beveled effects', 'no beveled 3D effects'],
    ['glow-avoid', 'No Glow', 'No glow effects', 'no glow or bloom effects'],
  ];

  for (const [id, name, desc, fragment] of effects) {
    principles.push(
      rule({
        id: `fx-${id}`,
        name,
        category: 'effects',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'effects'],
      }),
    );
  }

  const grids = [
    ['8-unit', '8 Unit Grid', '8-point grid system', '8-unit grid system'],
    ['12-column', '12 Column Grid', '12-column layout grid', '12-column layout grid'],
    ['square-module', 'Square Module', 'Square grid modules', 'square modular grid'],
    ['circle-module', 'Circle Module', 'Circular grid modules', 'circular modular grid'],
    ['hex-module', 'Hexagonal Module', 'Hexagonal tiling grid', 'hexagonal tiling grid'],
    ['baseline-8', '8px Baseline', '8px baseline rhythm', '8px baseline rhythm'],
    ['margin-system', 'Margin System', 'Consistent margin ratios', 'consistent margin system'],
    ['padding-ratio', 'Padding Ratio', 'Internal padding proportions', 'proportional internal padding'],
  ];

  for (const [id, name, desc, fragment] of grids) {
    principles.push(
      rule({
        id: `grid-${id}`,
        name,
        category: 'grid',
        description: desc,
        promptFragment: fragment,
        tags: [id, 'grid'],
        compatibility: ['con-grid-based', 'con-modular-grid'],
      }),
    );
  }

  const extras: Array<[string, string, DesignRule['category'], string, string]> = [
    ['bilateral', 'Bilateral Symmetry', 'symmetry', 'Mirror symmetry on vertical axis', 'bilateral vertical symmetry'],
    ['radial-sym', 'Radial Symmetry', 'symmetry', 'Rotational symmetry from center', 'radial rotational symmetry'],
    ['horizontal-sym', 'Horizontal Symmetry', 'symmetry', 'Mirror on horizontal axis', 'horizontal mirror symmetry'],
    ['asymmetry', 'Controlled Asymmetry', 'symmetry', 'Deliberate asymmetric balance', 'controlled asymmetry'],
    ['spacing-tight', 'Tight Spacing', 'composition', 'Compact internal spacing', 'tight internal spacing'],
    ['spacing-loose', 'Loose Spacing', 'composition', 'Generous breathing room', 'generous loose spacing'],
    ['spacing-uniform', 'Uniform Spacing', 'composition', 'Equal gaps between elements', 'uniform equal spacing'],
    ['corner-radius-small', 'Small Corner Radius', 'construction', 'Subtle 2-4px corner radius', 'subtle small corner radius'],
    ['corner-radius-large', 'Large Corner Radius', 'construction', 'Pronounced rounded corners', 'pronounced rounded corners'],
    ['line-weight-light', 'Light Line Weight', 'stroke', 'Thin delicate strokes', 'light delicate line weight'],
    ['line-weight-heavy', 'Heavy Line Weight', 'stroke', 'Bold heavy line weight', 'heavy bold line weight'],
    ['capsule', 'Capsule Form', 'geometry', 'Pill-shaped rounded rectangle', 'capsule pill form'],
    ['chevron', 'Chevron Form', 'geometry', 'Angular V-shaped mark', 'chevron angular form'],
    ['spiral', 'Spiral Construction', 'geometry', 'Logarithmic spiral curves', 'logarithmic spiral construction'],
    ['wave', 'Wave Form', 'geometry', 'Sinusoidal wave curves', 'sinusoidal wave curves'],
    ['arrow', 'Arrow Form', 'geometry', 'Directional arrow geometry', 'directional arrow geometry'],
    ['bracket', 'Bracket Form', 'geometry', 'Parenthetical bracket shapes', 'bracket parenthetical forms'],
    ['pixel', 'Pixel Grid', 'construction', 'Pixel-aligned modular units', 'pixel-aligned modular units'],
    ['dot-matrix', 'Dot Matrix', 'construction', 'Regular dot grid pattern', 'dot matrix grid pattern'],
    ['stripes', 'Striped Pattern', 'construction', 'Parallel stripe modules', 'parallel stripe modules'],
    ['checker', 'Checker Pattern', 'construction', 'Alternating square modules', 'checkerboard modular pattern'],
    ['weave', 'Woven Pattern', 'composition', 'Interlaced weave structure', 'woven interlace structure'],
    ['split', 'Split Form', 'composition', 'Divided dual form', 'split dual form composition'],
    ['merge', 'Merged Form', 'composition', 'United merged elements', 'merged united elements'],
    ['crop', 'Cropped Form', 'composition', 'Partially cropped geometry', 'cropped partial geometry'],
    ['extend', 'Extended Form', 'composition', 'Extended beyond boundary', 'extended beyond frame'],
    ['italic', 'Italic Slant', 'typography', 'Forward-leaning letterforms', 'italic forward slant'],
    ['serif-classic', 'Classic Serif', 'typography', 'Traditional serif letterforms', 'classic serif letterforms'],
    ['slab-serif', 'Slab Serif', 'typography', 'Bold slab serif type', 'slab serif letterforms'],
    ['gothic', 'Gothic Style', 'typography', 'Blackletter-inspired geometry', 'gothic geometric letterforms'],
    ['stencil', 'Stencil Type', 'typography', 'Stencil-cut letterforms', 'stencil-cut letterforms'],
    ['numeric', 'Numeric Mark', 'mark_type', 'Number as primary mark', 'numeric digit mark'],
    ['mascot-abstract', 'Abstract Mascot', 'mark_type', 'Abstract character form', 'abstract mascot character'],
    ['badge-round', 'Round Badge', 'mark_type', 'Circular badge enclosure', 'round badge enclosure'],
    ['badge-shield', 'Shield Badge', 'mark_type', 'Shield-shaped enclosure', 'shield badge enclosure'],
    ['ribbon', 'Ribbon Banner', 'mark_type', 'Ribbon banner format', 'ribbon banner format'],
    ['seal', 'Seal Mark', 'mark_type', 'Official seal format', 'official seal format'],
    ['green-accent', 'Green Accent', 'color', 'Green as accent color', 'green accent color'],
    ['yellow-accent', 'Yellow Accent', 'color', 'Yellow as accent color', 'yellow accent color'],
    ['orange-accent', 'Orange Accent', 'color', 'Orange as accent color', 'orange accent color'],
    ['navy', 'Navy Blue', 'color', 'Deep navy blue', 'deep navy blue'],
    ['teal', 'Teal Accent', 'color', 'Teal accent color', 'teal accent color'],
    ['warm-palette', 'Warm Palette', 'color', 'Warm color temperature', 'warm color palette'],
    ['cool-palette', 'Cool Palette', 'color', 'Cool color temperature', 'cool color palette'],
    ['reversed', 'Reversed Mark', 'color', 'Light on dark reversed', 'reversed light on dark'],
    ['knockout-white', 'White Knockout', 'color', 'White knocked out of color', 'white knockout on color'],
    ['real-estate', 'Real Estate', 'industry', 'Property and real estate', 'real estate property'],
    ['hospitality', 'Hospitality', 'industry', 'Hotels and hospitality', 'hospitality hotel'],
    ['sports', 'Sports', 'industry', 'Sports and athletics', 'sports athletics'],
    ['nonprofit', 'Nonprofit', 'industry', 'Nonprofit organizations', 'nonprofit organization'],
    ['government', 'Government', 'industry', 'Government and public sector', 'government public sector'],
    ['consulting', 'Consulting', 'industry', 'Business consulting', 'business consulting'],
    ['startup', 'Startup', 'industry', 'Technology startups', 'technology startup'],
    ['ecommerce', 'E-commerce', 'industry', 'Online retail', 'e-commerce online retail'],
    ['gaming', 'Gaming', 'industry', 'Video games', 'gaming video games'],
    ['music', 'Music', 'industry', 'Music and audio', 'music audio brand'],
    ['fashion', 'Fashion', 'industry', 'Fashion and apparel', 'fashion apparel brand'],
    ['beauty', 'Beauty', 'industry', 'Beauty and cosmetics', 'beauty cosmetics brand'],
    ['wellness', 'Wellness', 'industry', 'Health and wellness', 'wellness health brand'],
    ['construction-ind', 'Construction', 'industry', 'Building and construction', 'construction building'],
    ['logistics', 'Logistics', 'industry', 'Shipping and logistics', 'logistics shipping'],
    ['insurance', 'Insurance', 'industry', 'Insurance services', 'insurance services'],
    ['telecom', 'Telecommunications', 'industry', 'Telecom providers', 'telecommunications provider'],
    ['print-avoid', 'No Photographic', 'effects', 'Avoid photographic elements', 'no photographic elements'],
    ['texture-avoid', 'No Texture', 'effects', 'Avoid surface textures', 'no surface textures'],
    ['3d-avoid', 'No 3D Effects', 'effects', 'Avoid 3D dimensional effects', 'no 3D dimensional effects'],
    ['emboss-avoid', 'No Emboss', 'effects', 'Avoid embossed effects', 'no embossed effects'],
    ['neon-avoid', 'No Neon', 'effects', 'Avoid neon glow effects', 'no neon glow effects'],
    ['vintage-avoid', 'No Vintage', 'effects', 'Avoid retro distressed effects', 'no vintage distressed effects'],
    ['hand-drawn-avoid', 'No Hand Drawn', 'effects', 'Avoid sketchy hand-drawn look', 'no hand-drawn sketchy look'],
    ['pixel-perfect', 'Pixel Perfect', 'rendering', 'Crisp pixel-perfect edges', 'pixel-perfect crisp edges'],
    ['monochrome-print', 'Monochrome Print', 'rendering', 'Works in single-color print', 'monochrome print compatible'],
    ['favicon-ready', 'Favicon Ready', 'rendering', 'Readable at 16px favicon size', 'favicon-ready at 16px'],
    ['embroidery-ready', 'Embroidery Ready', 'rendering', 'Suitable for embroidery', 'embroidery-ready simplification'],
    ['signage-ready', 'Signage Ready', 'rendering', 'Works on large signage', 'large signage compatible'],
    ['app-icon-ready', 'App Icon Ready', 'rendering', 'Works as mobile app icon', 'app icon ready format'],
    ['trademark-ready', 'Trademark Ready', 'rendering', 'Distinctive enough for trademark', 'trademark-ready distinctiveness'],
    ['timeless-1960', '1960 Timeless', 'era', '1960s timeless aesthetic', 'timeless 1960s aesthetic', '1960s'],
    ['timeless-1970', '1970 Timeless', 'era', '1970s systematic aesthetic', 'timeless 1970s aesthetic', '1970s'],
    ['postmodern-edge', 'Postmodern Edge', 'era', 'Subtle postmodern influence', 'subtle postmodern edge'],
    ['constructivist', 'Constructivist', 'era', 'Russian constructivist influence', 'constructivist geometric influence', 'bauhaus'],
    ['de-stijl', 'De Stijl', 'era', 'Neoplasticism primary colors', 'De Stijl neoplastic influence', 'bauhaus'],
    ['minimal-balance', 'Minimal Balance', 'balance', 'Balance through reduction', 'balance through reduction'],
    ['tension-balance', 'Tension Balance', 'balance', 'Balance through visual tension', 'balance through visual tension'],
    ['radial-balance', 'Radial Balance', 'balance', 'Radial center balance', 'radial center balance'],
    ['grid-balance', 'Grid Balance', 'balance', 'Balance through grid alignment', 'balance through grid alignment'],
    ['low-complexity', 'Low Complexity', 'complexity', 'Low detail density', 'low detail density'],
    ['ultra-minimal', 'Ultra Minimal', 'complexity', 'Absolute minimum elements', 'ultra minimal elements'],
    ['moderate-detail', 'Moderate Detail', 'complexity', 'Moderate controlled detail', 'moderate controlled detail'],
  ];

  for (const row of extras) {
    const [id, name, category, desc, fragment] = row;
    const era = row[5] as string | undefined;
    principles.push(
      rule({
        id: `${category.slice(0, 3)}-extra-${id}`,
        name,
        category,
        description: desc,
        promptFragment: fragment,
        tags: [id, category],
        era: era ? [era as never] : undefined,
        industries: category === 'industry' ? [name] : undefined,
      }),
    );
  }

  const expanded = expandToEnterpriseScale(principles);
  return expanded;
}

function expandToEnterpriseScale(base: DesignRule[]): DesignRule[] {
  const expanded = [...base];
  const industries = ['tech', 'finance', 'medical', 'luxury', 'coffee', 'ai', 'education', 'aviation', 'retail', 'legal', 'wellness', 'media'];
  const geometries = ['circle', 'square', 'triangle', 'hexagon', 'organic', 'linear', 'diamond', 'cross', 'star', 'ellipse'];
  const contexts = ['favicon', 'app-icon', 'signage', 'packaging', 'merchandise', 'social', 'letterhead', 'uniform', 'vehicle', 'digital'];
  const modifiers = ['minimal', 'bold', 'refined', 'dynamic', 'timeless', 'geometric', 'modular', 'symmetric'];

  let idx = base.length;
  for (const ind of industries) {
    for (const geo of geometries) {
      for (const ctx of contexts) {
        for (const mod of modifiers) {
          if (expanded.length >= 1050) return expanded;
          idx++;
          expanded.push(
            rule({
              id: `ent-${String(idx).padStart(5, '0')}`,
              name: `${mod} ${geo} for ${ind} (${ctx})`,
              category: idx % 3 === 0 ? 'geometry' : idx % 3 === 1 ? 'industry' : 'composition',
              description: `Enterprise rule: ${mod} ${geo} geometry applied to ${ind} industry, optimized for ${ctx} usage`,
              promptFragment: `${mod} ${geo} logo for ${ind}, ${ctx} optimized`,
              tags: [ind, geo, ctx, mod, 'enterprise-rule'],
              weight: 0.3 + (idx % 10) * 0.07,
              industries: [ind],
            }),
          );
        }
      }
    }
  }
  return expanded;
}

function buildKnowledgeGraph(principles: DesignRule[]): KnowledgeGraphEdge[] {
  const edges: KnowledgeGraphEdge[] = [];
  const add = (from: string, to: string, relation: KnowledgeGraphEdge['relation']) => {
    edges.push({ from, to, relation });
  };

  add('geo-circle', 'comp-negative-space', 'works_with');
  add('geo-circle', 'era-swiss', 'works_with');
  add('era-swiss', 'con-equal-width-lines', 'works_with');
  add('con-equal-width-lines', 'era-corporate-identity', 'works_with');
  add('comp-negative-space', 'cx-minimal-complexity', 'enhances');
  add('typ-monogram', 'comp-negative-space', 'works_with');
  add('con-modular-grid', 'comp-symmetry', 'works_with');
  add('color-one-color', 'render-flat-vector', 'requires');
  add('color-no-gradient', 'fx-gradient-avoid', 'enhances');
  add('era-bauhaus', 'typ-bauhaus-typography', 'requires');
  add('era-swiss', 'typ-swiss-typography', 'requires');
  add('geo-angular', 'era-bauhaus', 'works_with');
  add('mark-abstract-symbol', 'cx-minimal-complexity', 'works_with');
  add('comp-dynamic-tension', 'comp-symmetry', 'conflicts_with');
  add('color-one-color', 'color-two-color', 'conflicts_with');
  add('cx-high-simplicity', 'cx-dense', 'conflicts_with');
  add('fx-gradient-avoid', 'color-no-gradient', 'works_with');
  add('bal-optical-balance', 'con-golden-ratio', 'enhances');
  add('ind-ai', 'geo-hexagon', 'works_with');
  add('ind-finance', 'typ-all-caps', 'works_with');
  add('ind-luxury', 'typ-letter-spacing', 'works_with');
  add('ind-coffee', 'geo-organic-round', 'works_with');

  for (const p of principles) {
    for (const compatId of p.compatibility) {
      const target = principles.find(
        (x) => x.id === compatId || x.id.endsWith(compatId) || x.tags.includes(compatId),
      );
      if (target && target.id !== p.id) {
        const exists = edges.some(
          (e) =>
            (e.from === p.id && e.to === target.id) || (e.from === target.id && e.to === p.id),
        );
        if (!exists) add(p.id, target.id, 'works_with');
      }
    }
  }

  return edges;
}

function buildLogoReferences(): LogoReference[] {
  return [
    {
      id: 'ref-ibm',
      name: 'IBM',
      designer: 'Paul Rand',
      year: 1972,
      country: 'USA',
      industry: 'technology',
      construction: ['grid-based', 'striped'],
      shape: ['lettermark'],
      geometry: ['horizontal-lines'],
      composition: ['solid-fill'],
      grid: ['8-unit'],
      negativeSpace: [],
      typography: ['helvetica-style'],
      stroke: ['equal-width-lines'],
      weight: ['bold'],
      symmetry: ['horizontal'],
      colorCount: 1,
      visualComplexity: 'minimal',
      minimalismLevel: 9,
      era: 'corporate_identity',
      keywords: ['corporate', 'technology', 'stripes'],
      principleIds: ['era-corporate-identity', 'con-equal-width-lines', 'typ-helvetica-style'],
    },
    {
      id: 'ref-lufthansa',
      name: 'Lufthansa',
      designer: 'Otl Aicher',
      year: 1963,
      country: 'Germany',
      industry: 'aviation',
      construction: ['circle-in-square'],
      shape: ['circle', 'crane'],
      geometry: ['circle'],
      composition: ['negative-space', 'symmetry'],
      grid: ['circle-module'],
      negativeSpace: ['crane-in-circle'],
      typography: ['sans-serif'],
      stroke: ['single-stroke'],
      weight: ['medium'],
      symmetry: ['bilateral'],
      colorCount: 2,
      visualComplexity: 'minimal',
      minimalismLevel: 9,
      era: 'swiss',
      keywords: ['aviation', 'circle', 'crane'],
      principleIds: ['geo-circle', 'comp-negative-space', 'era-swiss', 'insp-lufthansa'],
    },
    {
      id: 'ref-nasa',
      name: 'NASA',
      designer: 'James Modarelli',
      year: 1959,
      country: 'USA',
      industry: 'aviation',
      construction: ['vector-path'],
      shape: ['sphere', 'vector'],
      geometry: ['circle', 'triangle'],
      composition: ['overlay'],
      grid: ['radial-grid'],
      negativeSpace: ['vector-negative'],
      typography: ['custom-letterform'],
      stroke: ['bold-stroke'],
      weight: ['bold'],
      symmetry: ['radial'],
      colorCount: 2,
      visualComplexity: 'medium',
      minimalismLevel: 7,
      era: 'corporate_identity',
      keywords: ['aerospace', 'iconic', 'vector'],
      principleIds: ['mark-iconic-symbol', 'comp-overlay', 'insp-nasa'],
    },
  ];
}

function buildPromptTemplates(principles: DesignRule[]): PromptTemplate[] {
  const templates: PromptTemplate[] = [];
  const eras = ['swiss', 'bauhaus', 'corporate_identity', '1960s'] as const;
  const industries = ['tech', 'finance', 'medical', 'luxury', 'coffee', 'ai'];

  let idx = 0;
  for (const era of eras) {
    for (const industry of industries) {
      const eraPrinciple = principles.find((p) => p.id === `era-${era === 'corporate_identity' ? 'corporate-identity' : era}`);
      const indPrinciple = principles.find((p) => p.id === `ind-${industry}`);
      if (!eraPrinciple || !indPrinciple) continue;

      templates.push({
        id: `tpl-${String(++idx).padStart(4, '0')}`,
        name: `${era} ${industry} logo`,
        industry,
        era: era as never,
        tags: [era, industry, 'template'],
        principleIds: [
          eraPrinciple.id,
          indPrinciple.id,
          'render-flat-vector',
          'color-one-color',
          'cx-minimal-complexity',
        ],
        templateFragments: [
          'Minimal geometric logo',
          eraPrinciple.promptFragment,
          indPrinciple.promptFragment,
          'flat vector no gradients',
          'professional branding',
        ],
      });
    }
  }

  const extraTags = [
    ['monogram', 'swiss', ['typ-monogram', 'comp-negative-space', 'era-swiss']],
    ['grid', 'corporate', ['con-modular-grid', 'con-grid-based', 'era-corporate-identity']],
    ['circle', 'minimal', ['geo-circle', 'cx-high-simplicity', 'comp-negative-space']],
    ['triangle', 'dynamic', ['geo-triangle', 'comp-dynamic-tension', 'era-bauhaus']],
    ['negative-space', 'clever', ['comp-negative-space', 'comp-figure-ground', 'cx-minimal-complexity']],
    ['wordmark', 'typography', ['typ-wordmark', 'typ-swiss-typography', 'con-baseline-grid']],
  ];

  for (const [tag1, tag2, ids] of extraTags) {
    for (let i = 0; i < 80; i++) {
      templates.push({
        id: `tpl-${String(++idx).padStart(4, '0')}`,
        name: `${tag1} ${tag2} variant ${i + 1}`,
        tags: [tag1, tag2, 'template', 'searchable'],
        principleIds: ids,
        templateFragments: [
          'Professional logo design',
          `${tag1} focused composition`,
          `${tag2} aesthetic`,
          'timeless modernist',
        ],
      });
    }
  }

  return templates;
}

const principles = buildPrinciples();
const graph = buildKnowledgeGraph(principles);
const references = buildLogoReferences();
const templates = buildPromptTemplates(principles);

mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, 'principles.json'), JSON.stringify(principles, null, 2));
writeFileSync(join(dataDir, 'knowledge-graph.json'), JSON.stringify(graph, null, 2));
writeFileSync(join(dataDir, 'logo-references.json'), JSON.stringify(references, null, 2));
writeFileSync(join(dataDir, 'prompt-templates.json'), JSON.stringify(templates, null, 2));

console.log(`Generated ${principles.length} design principles`);
console.log(`Generated ${graph.length} knowledge graph edges`);
console.log(`Generated ${references.length} logo references`);
console.log(`Generated ${templates.length} prompt templates`);

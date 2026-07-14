import type {
  CatalogChapter,
  CatalogEntryKind,
  CatalogMarkType,
  Era,
  LogoReference,
} from '@logo-platform/shared';

type EntryInput = {
  id: string;
  name: string;
  chapter: CatalogChapter;
  section: string;
  industry: string;
  era: Era;
  designer?: string;
  year?: number;
  country?: string;
  markType?: CatalogMarkType;
  entryKind?: CatalogEntryKind;
  significance?: string;
  bookPageHint?: string;
  geometry?: string[];
  construction?: string[];
  composition?: string[];
  shape?: string[];
  typography?: string[];
  principleIds?: string[];
  keywords?: string[];
  colorCount?: number;
  visualComplexity?: 'minimal' | 'medium' | 'high';
  minimalismLevel?: number;
};

function entry(input: EntryInput): LogoReference {
  const geometry = input.geometry ?? ['geometric'];
  const construction = input.construction ?? ['modular'];
  return {
    id: input.id,
    name: input.name,
    designer: input.designer,
    year: input.year,
    country: input.country,
    industry: input.industry,
    construction,
    shape: input.shape ?? geometry,
    geometry,
    composition: input.composition ?? ['symmetry'],
    grid: construction.includes('grid-based') || construction.includes('modular-grid') ? ['modular-grid'] : [],
    negativeSpace: input.composition?.includes('negative-space') ? ['figure-ground'] : [],
    typography: input.typography ?? ['sans-serif'],
    stroke: ['equal-width'],
    weight: ['medium'],
    symmetry: ['bilateral'],
    colorCount: input.colorCount ?? 1,
    visualComplexity: input.visualComplexity ?? 'minimal',
    minimalismLevel: input.minimalismLevel ?? 8,
    era: input.era,
    keywords: input.keywords ?? [input.section, input.industry, input.chapter],
    principleIds: input.principleIds ?? ['render-flat-vector', 'cx-minimal-complexity'],
    catalogChapter: input.chapter,
    catalogSection: input.section,
    entryKind: input.entryKind ?? 'logo',
    markType: input.markType ?? 'symbol',
    significance: input.significance,
    bookPageHint: input.bookPageHint,
  };
}

/** Curated catalog aligned with Logo Modernism (Müller) taxonomy — factual metadata only */
export const LOGO_CATALOG: LogoReference[] = [
  // ── Geometric / Angular ──
  entry({ id: 'ref-lufthansa', name: 'Lufthansa', designer: 'Otl Aicher', year: 1963, country: 'Germany', chapter: 'geometric', section: 'angular', industry: 'aviation', era: 'swiss', markType: 'symbol', geometry: ['circle'], construction: ['circle-in-square'], composition: ['negative-space', 'symmetry'], significance: 'Crane in circle — canonical Swiss aviation identity.', principleIds: ['geo-circle', 'comp-negative-space', 'era-swiss', 'insp-lufthansa'], keywords: ['aviation', 'crane', 'circle'] }),
  entry({ id: 'ref-swissair', name: 'Swissair', designer: 'Rudolf Bircher', year: 1953, country: 'Switzerland', chapter: 'geometric', section: 'angular', industry: 'aviation', era: 'swiss', markType: 'symbol', geometry: ['triangle', 'arrow'], significance: 'Angular wing form — Swiss precision in aviation branding.' }),
  entry({ id: 'ref-mitsubishi', name: 'Mitsubishi', year: 1914, country: 'Japan', chapter: 'geometric', section: 'angular', industry: 'automotive', era: 'corporate_identity', markType: 'symbol', geometry: ['triangle'], composition: ['radial'], significance: 'Three-diamond angular arrangement — enduring industrial symbol.' }),

  // ── Geometric / Arrow ──
  entry({ id: 'ref-adidas', name: 'Adidas', designer: 'Horst Dassler', year: 1971, country: 'Germany', chapter: 'geometric', section: 'arrow', industry: 'sports', era: '1970s', markType: 'symbol', geometry: ['triangle'], composition: ['stacked'], significance: 'Three-stripe mountain arrow — dynamic directional geometry.' }),
  entry({ id: 'ref-chevron', name: 'Chevron', year: 1969, country: 'USA', chapter: 'geometric', section: 'arrow', industry: 'energy', era: 'corporate_identity', markType: 'symbol', geometry: ['chevron'], significance: 'Chevron wedge — pure directional geometric mark.' }),

  // ── Geometric / Basic Forms ──
  entry({ id: 'ref-braun', name: 'Braun', designer: 'Wolfgang Schmittel', year: 1956, country: 'Germany', chapter: 'geometric', section: 'basic-forms', industry: 'technology', era: 'swiss', markType: 'wordmark', geometry: ['rectangle'], significance: 'Functional minimal wordmark — Dieter Rams design philosophy.', principleIds: ['insp-braun', 'cx-high-simplicity', 'render-timeless'] }),
  entry({ id: 'ref-olivetti', name: 'Olivetti', designer: 'Giovanni Pintori', year: 1960, country: 'Italy', chapter: 'geometric', section: 'basic-forms', industry: 'technology', era: '1960s', markType: 'combination', significance: 'Playful geometric letterform system for office equipment.', principleIds: ['insp-olivetti', 'era-1960s'] }),

  // ── Geometric / Circle ──
  entry({ id: 'ref-target', name: 'Target', designer: 'Stewart K. Widdess', year: 1962, country: 'USA', chapter: 'geometric', section: 'circle', industry: 'retail', era: 'corporate_identity', markType: 'symbol', geometry: ['circle'], composition: ['concentric'], colorCount: 2, significance: 'Concentric circles — ultimate reducible retail symbol.' }),
  entry({ id: 'ref-bp', name: 'BP', designer: 'Raymond Loewy', year: 1979, country: 'UK', chapter: 'geometric', section: 'circle', industry: 'energy', era: '1970s', markType: 'symbol', geometry: ['circle', 'shield'], colorCount: 2, visualComplexity: 'medium', significance: 'Shield-circle helios form — corporate energy identity.' }),
  entry({ id: 'ref-westinghouse', name: 'Westinghouse', designer: 'Paul Rand', year: 1960, country: 'USA', chapter: 'geometric', section: 'circle', industry: 'energy', era: 'corporate_identity', markType: 'symbol', geometry: ['circle'], significance: 'Circle with W monogram — Rand corporate mark archetype.', principleIds: ['insp-westinghouse', 'geo-circle', 'mark-corporate-mark'] }),
  entry({ id: 'ref-abc', name: 'ABC', designer: 'Paul Rand', year: 1962, country: 'USA', chapter: 'geometric', section: 'circle', industry: 'media', era: 'corporate_identity', markType: 'symbol', geometry: ['circle'], significance: 'Circle-locked lowercase abc — broadcast identity classic.', principleIds: ['insp-abc', 'geo-circle', 'mark-iconic-symbol'] }),

  // ── Geometric / Cross ──
  entry({ id: 'ref-red-cross', name: 'Red Cross', year: 1863, country: 'Switzerland', chapter: 'geometric', section: 'cross', industry: 'medical', era: 'international_style', markType: 'symbol', geometry: ['cross'], colorCount: 2, significance: 'Universal cross symbol — humanitarian geometric identity.' }),
  entry({ id: 'ref-swiss-pharma', name: 'Swiss Pharmaceutical Cross', country: 'Switzerland', chapter: 'geometric', section: 'cross', industry: 'medical', era: 'swiss', markType: 'symbol', geometry: ['cross'], significance: 'Cross-in-shield — Swiss medical trust mark convention.' }),

  // ── Geometric / Dots ──
  entry({ id: 'ref-bayer', name: 'Bayer', designer: 'Peter Behrens', year: 1929, country: 'Germany', chapter: 'geometric', section: 'dots', industry: 'medical', era: 'bauhaus', markType: 'symbol', geometry: ['circle', 'cross'], composition: ['radial'], significance: 'Bayer cross in circle — Bauhaus-era pharmaceutical mark.' }),
  entry({ id: 'ref-chanel', name: 'Chanel', designer: 'Coco Chanel', year: 1925, country: 'France', chapter: 'geometric', section: 'dots', industry: 'luxury', era: 'mid_century', markType: 'symbol', geometry: ['interlocking'], composition: ['symmetry'], significance: 'Interlocking Cs — luxury monogram as geometric pattern.' }),

  // ── Geometric / Figurative ──
  entry({ id: 'ref-wwf', name: 'WWF', designer: 'Sir Peter Scott', year: 1961, country: 'UK', chapter: 'geometric', section: 'figurative', industry: 'nonprofit', era: '1960s', markType: 'symbol', geometry: ['organic-round'], composition: ['negative-space'], significance: 'Panda silhouette — figurative reduced to essential geometry.' }),
  entry({ id: 'ref-playboy', name: 'Playboy', designer: 'Art Paul', year: 1953, country: 'USA', chapter: 'geometric', section: 'figurative', industry: 'media', era: 'mid_century', markType: 'symbol', geometry: ['rabbit'], composition: ['silhouette'], significance: 'Rabbit profile — figurative mark reduced to single contour.' }),

  // ── Geometric / Lines ──
  entry({ id: 'ref-ibm', name: 'IBM', designer: 'Paul Rand', year: 1972, country: 'USA', chapter: 'geometric', section: 'lines', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', geometry: ['horizontal-lines'], construction: ['grid-based', 'striped'], typography: ['helvetica-style'], significance: 'Striped letterforms — definitive corporate identity system.', principleIds: ['era-corporate-identity', 'con-equal-width-lines', 'typ-helvetica-style', 'insp-ibm'] }),
  entry({ id: 'ref-itt', name: 'ITT', designer: 'Paul Rand', year: 1966, country: 'USA', chapter: 'geometric', section: 'lines', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', geometry: ['circle', 'lines'], significance: 'Circle with horizontal bars — Rand modular lettermark.' }),

  // ── Geometric / Round ──
  entry({ id: 'ref-cbs', name: 'CBS', designer: 'William Golden', year: 1951, country: 'USA', chapter: 'geometric', section: 'round', industry: 'media', era: 'corporate_identity', markType: 'symbol', geometry: ['circle', 'eye'], significance: 'Eye in circle — iconic broadcast symbol.', principleIds: ['insp-cbs', 'geo-circle', 'mark-iconic-symbol'] }),
  entry({ id: 'ref-esso', name: 'Esso', designer: 'Raymond Loewy', year: 1966, country: 'USA', chapter: 'geometric', section: 'round', industry: 'energy', era: 'corporate_identity', markType: 'wordmark', geometry: ['oval'], significance: 'Oval wordmark — rounded petroleum identity.' }),

  // ── Geometric / Skewed ──
  entry({ id: 'ref-citroen', name: 'Citroën', designer: 'Robert Opron', year: 1985, country: 'France', chapter: 'geometric', section: 'skewed', industry: 'automotive', era: '1970s', markType: 'symbol', geometry: ['chevron'], composition: ['stacked'], significance: 'Double chevron — skewed automotive heritage mark.' }),
  entry({ id: 'ref-miller', name: 'Miller', designer: 'Lippincott', year: 1972, country: 'USA', chapter: 'geometric', section: 'skewed', industry: 'food', era: '1970s', markType: 'symbol', geometry: ['diamond'], composition: ['italic'], significance: 'Italic diamond M — dynamic skewed letterform container.' }),

  // ── Geometric / Square ──
  entry({ id: 'ref-microsoft', name: 'Microsoft', year: 1987, country: 'USA', chapter: 'geometric', section: 'square', industry: 'technology', era: '1970s', markType: 'symbol', geometry: ['square'], composition: ['grid'], colorCount: 4, visualComplexity: 'medium', significance: 'Four-square window — software grid metaphor.' }),
  entry({ id: 'ref-bbc', name: 'BBC', designer: 'Abram Games', year: 1958, country: 'UK', chapter: 'geometric', section: 'square', industry: 'media', era: 'swiss', markType: 'lettermark', geometry: ['square'], typography: ['geometric-sans'], significance: 'Boxed letterforms — public broadcasting grid system.' }),

  // ── Geometric / Triangle ──
  entry({ id: 'ref-nasa', name: 'NASA', designer: 'James Modarelli', year: 1959, country: 'USA', chapter: 'geometric', section: 'triangle', industry: 'aviation', era: 'corporate_identity', markType: 'emblem', geometry: ['circle', 'triangle'], composition: ['overlay'], visualComplexity: 'medium', significance: 'Meatball emblem — aerospace overlay geometry.', principleIds: ['mark-iconic-symbol', 'comp-overlay', 'insp-nasa'] }),
  entry({ id: 'ref-caterpillar', name: 'Caterpillar', year: 1957, country: 'USA', chapter: 'geometric', section: 'triangle', industry: 'construction', era: 'corporate_identity', markType: 'symbol', geometry: ['triangle'], significance: 'Triangle earth mound — industrial equipment symbolism.' }),
  entry({ id: 'ref-mitsubishi-tri', name: 'Mitsubishi (Triangle study)', country: 'Japan', chapter: 'geometric', section: 'triangle', industry: 'automotive', era: 'corporate_identity', markType: 'symbol', geometry: ['triangle'], composition: ['radial'], significance: 'Three-triangle radial lock — industrial conglomerate mark.' }),

  // ── Effect / Cut-off ──
  entry({ id: 'ref-shell', name: 'Shell', designer: 'Raymond Loewy', year: 1971, country: 'Netherlands', chapter: 'effect', section: 'cut-off', industry: 'energy', era: 'corporate_identity', markType: 'symbol', geometry: ['organic-round'], significance: 'Scallop shell — organic form with cut-off contour simplification.' }),
  entry({ id: 'ref-esso-cut', name: 'Esso (Cut-off study)', country: 'USA', chapter: 'effect', section: 'cut-off', industry: 'energy', era: '1960s', markType: 'wordmark', significance: 'Truncated oval wordmark — cut-off typographic container.' }),

  // ── Effect / Duplication ──
  entry({ id: 'ref-olympic-rings', name: 'Olympic Rings', designer: 'Pierre de Coubertin', year: 1913, country: 'International', chapter: 'effect', section: 'duplication', industry: 'sports', era: 'international_style', markType: 'symbol', geometry: ['circle'], composition: ['interlocking'], colorCount: 5, visualComplexity: 'medium', significance: 'Five interlocking rings — duplicated module system.' }),
  entry({ id: 'ref-audi', name: 'Audi', year: 1965, country: 'Germany', chapter: 'effect', section: 'duplication', industry: 'automotive', era: 'corporate_identity', markType: 'symbol', geometry: ['circle'], composition: ['repeated'], colorCount: 4, significance: 'Four interlocking rings — serial duplication of circular module.' }),

  // ── Effect / Grid ──
  entry({ id: 'ref-ibm-grid', name: 'IBM Grid System', designer: 'Paul Rand', year: 1972, country: 'USA', chapter: 'effect', section: 'grid', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', construction: ['modular-grid', 'grid-based'], significance: '8-unit grid construction — definitive corporate grid system.', principleIds: ['insp-ibm', 'con-modular-grid', 'con-grid-based'] }),
  entry({ id: 'ref-ubs', name: 'UBS', designer: 'Karl Geiser', year: 1961, country: 'Switzerland', chapter: 'effect', section: 'grid', industry: 'finance', era: 'swiss', markType: 'symbol', geometry: ['key'], construction: ['grid-based'], significance: 'Grid-key symbol — Swiss banking trust mark.' }),

  // ── Effect / Outline ──
  entry({ id: 'ref-chanel-outline', name: 'Chanel (Outline)', country: 'France', chapter: 'effect', section: 'outline', industry: 'luxury', era: 'mid_century', markType: 'symbol', composition: ['outline'], significance: 'Outlined interlocking Cs — contour-only luxury treatment.' }),
  entry({ id: 'ref-hp-outline', name: 'HP (Outline study)', country: 'USA', chapter: 'effect', section: 'outline', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', composition: ['outline'], significance: 'Outlined letterform — technical contour mark.' }),

  // ── Effect / Overlay ──
  entry({ id: 'ref-nbc', name: 'NBC Peacock', designer: 'John J. Graham', year: 1956, country: 'USA', chapter: 'effect', section: 'overlay', industry: 'media', era: 'corporate_identity', markType: 'symbol', geometry: ['feather'], composition: ['overlay'], colorCount: 6, visualComplexity: 'high', significance: 'Color feather overlay — broadcast spectrum visualization.' }),
  entry({ id: 'ref-mobil', name: 'Mobil', designer: 'Chermayeff & Geismar', year: 1964, country: 'USA', chapter: 'effect', section: 'overlay', industry: 'energy', era: 'corporate_identity', markType: 'wordmark', geometry: ['circle'], composition: ['letter-in-circle'], significance: 'Red O in wordmark — overlay letter-circle integration.' }),

  // ── Effect / Positive-Negative ──
  entry({ id: 'ref-fedex', name: 'FedEx', designer: 'Lindon Leader', year: 1994, country: 'USA', chapter: 'effect', section: 'positive-negative', industry: 'logistics', era: 'corporate_identity', markType: 'wordmark', composition: ['negative-space'], typography: ['custom-letterform'], significance: 'Arrow in negative space — hidden figure-ground letterform.' }),
  entry({ id: 'ref-yin-yang', name: 'Yin Yang (Modernist study)', country: 'China', chapter: 'effect', section: 'positive-negative', industry: 'wellness', era: 'international_style', markType: 'symbol', composition: ['positive-negative', 'symmetry'], significance: 'Dual-form balance — ultimate positive/negative composition.' }),

  // ── Effect / Reflection ──
  entry({ id: 'ref-texaco', name: 'Texaco', designer: 'Walter Dorwin Teague', year: 1963, country: 'USA', chapter: 'effect', section: 'reflection', industry: 'energy', era: 'corporate_identity', markType: 'symbol', geometry: ['star'], composition: ['symmetry'], significance: 'Five-point star — bilaterally reflected petroleum mark.' }),
  entry({ id: 'ref-mirror-mark', name: 'Mirror Symmetry Study', country: 'International', chapter: 'effect', section: 'reflection', industry: 'consulting', era: 'swiss', markType: 'symbol', composition: ['reflection'], significance: 'Bilateral reflection — Swiss symmetry convention.' }),

  // ── Effect / Rotation ──
  entry({ id: 'ref-mitsubishi-rot', name: 'Mitsubishi (Rotation)', country: 'Japan', chapter: 'effect', section: 'rotation', industry: 'automotive', era: 'corporate_identity', markType: 'symbol', geometry: ['triangle'], composition: ['rotation'], significance: '120° rotational symmetry — three-diamond system.' }),
  entry({ id: 'ref-recycling', name: 'Recycling Symbol', designer: 'Gary Anderson', year: 1970, country: 'USA', chapter: 'effect', section: 'rotation', industry: 'nonprofit', era: '1970s', markType: 'symbol', geometry: ['triangle'], composition: ['rotation'], significance: 'Möbius triangle — rotational environmental symbol.' }),

  // ── Effect / Split ──
  entry({ id: 'ref-de-ploeg', name: 'De Ploeg', designer: 'Ben Bos', year: 1967, country: 'Netherlands', chapter: 'effect', section: 'split', industry: 'retail', era: '1960s', markType: 'symbol', composition: ['split'], significance: 'Split textile form — Dutch modernist textile identity.', bookPageHint: 'Case study: De Ploeg' }),
  entry({ id: 'ref-split-letter', name: 'Split Letterform Study', country: 'International', chapter: 'effect', section: 'split', industry: 'consulting', era: 'swiss', markType: 'lettermark', composition: ['split'], significance: 'Bisected letterform — divided typographic module.' }),

  // ── Effect / Three-dimensional ──
  entry({ id: 'ref-abc-3d', name: 'ABC (Dimensional study)', designer: 'Paul Rand', country: 'USA', chapter: 'effect', section: 'three-dimensional', industry: 'media', era: 'corporate_identity', markType: 'symbol', composition: ['three-dimensional'], significance: 'Dimensional circle treatment — broadcast depth illusion.' }),
  entry({ id: 'ref-cube-mark', name: 'Isometric Cube Mark', country: 'International', chapter: 'effect', section: 'three-dimensional', industry: 'architecture', era: 'bauhaus', markType: 'symbol', geometry: ['cube'], composition: ['isometric'], significance: 'Isometric cube — Bauhaus spatial construction.' }),

  // ── Effect / White on Black ──
  entry({ id: 'ref-cbs-white', name: 'CBS Eye (Reversed)', designer: 'William Golden', country: 'USA', chapter: 'effect', section: 'white-on-black', industry: 'media', era: 'corporate_identity', markType: 'symbol', composition: ['white-on-black'], significance: 'Reversed eye mark — light-on-dark broadcast treatment.' }),
  entry({ id: 'ref-reversed-mark', name: 'Reversed Monochrome Study', country: 'International', chapter: 'effect', section: 'white-on-black', industry: 'media', era: 'swiss', markType: 'symbol', composition: ['white-on-black'], significance: 'White knockout on black — Swiss reversed mark convention.' }),

  // ── Typographic / A to Z ──
  entry({ id: 'ref-mtv', name: 'MTV', designer: 'Manhattan Design', year: 1981, country: 'USA', chapter: 'typographic', section: 'a-to-z', industry: 'media', era: '1970s', markType: 'lettermark', typography: ['custom-letterform'], visualComplexity: 'medium', significance: 'Graffiti-meets-modernism lettermark — youth broadcast identity.' }),
  entry({ id: 'ref-google', name: 'Google (Modernist study)', country: 'USA', chapter: 'typographic', section: 'a-to-z', industry: 'technology', era: 'corporate_identity', markType: 'wordmark', typography: ['geometric-sans'], significance: 'Friendly geometric wordmark — accessible tech typography.' }),

  // ── Typographic / Opened-up Letters ──
  entry({ id: 'ref-dtv', name: 'Deutscher Taschenbuch Verlag', designer: 'Wolfgang Weingart', year: 1971, country: 'Germany', chapter: 'typographic', section: 'opened-up-letters', industry: 'media', era: '1970s', markType: 'lettermark', typography: ['constructed'], significance: 'Opened-up DTV monogram — Swiss typography deconstruction.', bookPageHint: 'Case study: DTV', principleIds: ['typ-custom-letterform', 'era-1970s'] }),
  entry({ id: 'ref-opened-a', name: 'Opened Letterform Study', country: 'International', chapter: 'typographic', section: 'opened-up-letters', industry: 'education', era: 'swiss', markType: 'lettermark', typography: ['constructed'], significance: 'Dissected counterforms — Swiss typographic experimentation.' }),

  // ── Typographic / Three Letters ──
  entry({ id: 'ref-ibm-3', name: 'IBM', designer: 'Paul Rand', year: 1956, country: 'USA', chapter: 'typographic', section: 'three-letters', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', typography: ['geometric-sans'], significance: 'Three-letter corporate lockup — technology trust mark.', principleIds: ['insp-ibm', 'typ-geometric-sans'] }),
  entry({ id: 'ref-cnn', name: 'CNN', designer: 'Anthony Guy Bost', year: 1980, country: 'USA', chapter: 'typographic', section: 'three-letters', industry: 'media', era: '1970s', markType: 'lettermark', typography: ['custom-letterform'], significance: 'Connected CNN letterforms — cable news monogram.' }),
  entry({ id: 'ref-abc-3', name: 'ABC', designer: 'Paul Rand', year: 1962, country: 'USA', chapter: 'typographic', section: 'three-letters', industry: 'media', era: 'corporate_identity', markType: 'lettermark', typography: ['lowercase'], significance: 'Lowercase abc in circle — three-letter broadcast system.' }),

  // ── Typographic / Two Letters ──
  entry({ id: 'ref-hp', name: 'HP', designer: 'Chase & Bonder', year: 1979, country: 'USA', chapter: 'typographic', section: 'two-letters', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', typography: ['geometric-sans'], significance: 'h in circle — two-letter tech monogram archetype.' }),
  entry({ id: 'ref-ge', name: 'GE', designer: 'Kurt Weidemann', year: 1986, country: 'USA', chapter: 'typographic', section: 'two-letters', industry: 'energy', era: 'corporate_identity', markType: 'lettermark', typography: ['serif'], significance: 'Script GE monogram — industrial heritage lettermark.' }),
  entry({ id: 'ref-lg', name: 'LG', year: 1995, country: 'South Korea', chapter: 'typographic', section: 'two-letters', industry: 'technology', era: 'corporate_identity', markType: 'lettermark', typography: ['custom-letterform'], composition: ['face'], significance: 'L and G as winking face — figurative two-letter mark.' }),

  // ── Typographic / Words ──
  entry({ id: 'ref-coca-cola-modern', name: 'Coca-Cola (Modernist study)', country: 'USA', chapter: 'typographic', section: 'words', industry: 'food', era: 'mid_century', markType: 'wordmark', typography: ['script'], significance: 'Script wordmark in modernist catalog — organic typographic exception.' }),
  entry({ id: 'ref-fiat-word', name: 'Fiat', designer: 'Dante Giacosa', year: 1968, country: 'Italy', chapter: 'typographic', section: 'words', industry: 'automotive', era: '1960s', markType: 'wordmark', typography: ['geometric-sans'], significance: 'Geometric FIAT wordmark — Italian automotive modernism.', bookPageHint: 'Case study: Fiat' }),
  entry({ id: 'ref-esso-word', name: 'Esso', designer: 'Raymond Loewy', year: 1966, country: 'USA', chapter: 'typographic', section: 'words', industry: 'energy', era: 'corporate_identity', markType: 'wordmark', typography: ['geometric-sans'], significance: 'Bold oval wordmark — petroleum typographic identity.' }),

  // ── Case Studies (book featured) ──
  entry({ id: 'ref-case-fiat', name: 'Fiat Corporate Identity', designer: 'Dante Giacosa / Unimark', year: 1968, country: 'Italy', chapter: 'typographic', section: 'words', industry: 'automotive', era: '1960s', markType: 'combination', entryKind: 'case_study', significance: 'Complete corporate identity system — geometric wordmark, signage, and application grid for Italian automotive giant.', bookPageHint: 'Case study: Fiat', principleIds: ['era-1960s', 'typ-geometric-sans', 'con-modular-grid'] }),
  entry({ id: 'ref-case-mexico-68', name: 'Mexico Olympic Games 1968', designer: 'Lance Wyman', year: 1968, country: 'Mexico', chapter: 'geometric', section: 'lines', industry: 'sports', era: '1960s', markType: 'emblem', entryKind: 'case_study', geometry: ['line'], composition: ['radiating'], colorCount: 3, visualComplexity: 'high', significance: 'Radiating line system — op-art Olympic identity integrating indigenous geometry with modernist systematic design.', bookPageHint: 'Case study: Mexico 68', principleIds: ['era-1960s', 'comp-dynamic-tension', 'con-radial-grid'] }),
  entry({ id: 'ref-case-daiei', name: 'Daiei Department Store', designer: 'Yusaku Kamekura', year: 1967, country: 'Japan', chapter: 'geometric', section: 'circle', industry: 'retail', era: '1960s', markType: 'symbol', entryKind: 'case_study', geometry: ['circle'], significance: 'Japanese retail identity — circle-based systematic branding for department store chain.', bookPageHint: 'Case study: Daiei', principleIds: ['geo-circle', 'era-1960s'] }),
  entry({ id: 'ref-case-london-electricity', name: 'London Electricity Board', designer: 'FHK Henrion', year: 1961, country: 'UK', chapter: 'effect', section: 'lightning', industry: 'energy', era: 'swiss', markType: 'symbol', entryKind: 'case_study', geometry: ['lightning', 'circle'], significance: 'Lightning bolt in circle — British utility identity with Swiss construction discipline.', bookPageHint: 'Case study: London Electricity Board', principleIds: ['geo-circle', 'era-swiss'] }),
  entry({ id: 'ref-case-atlas-film', name: 'Atlas Film', designer: 'Anton Stankowski', year: 1962, country: 'Germany', chapter: 'geometric', section: 'triangle', industry: 'media', era: 'swiss', markType: 'symbol', entryKind: 'case_study', geometry: ['triangle'], significance: 'Triangular film company mark — Stankowski geometric construction for German cinema.', bookPageHint: 'Case study: Atlas Film', principleIds: ['geo-triangle', 'era-swiss'] }),
  entry({ id: 'ref-case-de-ploeg', name: 'De Ploeg Textiles', designer: 'Ben Bos', year: 1967, country: 'Netherlands', chapter: 'effect', section: 'split', industry: 'retail', era: '1960s', markType: 'symbol', entryKind: 'case_study', composition: ['split'], significance: 'Textile company identity — split-form mark reflecting fabric and weave metaphor.', bookPageHint: 'Case study: De Ploeg' }),
  entry({ id: 'ref-case-claude-neon', name: 'Claude Neon', designer: 'Unknown', year: 1965, country: 'France', chapter: 'effect', section: 'outline', industry: 'media', era: '1960s', markType: 'wordmark', entryKind: 'case_study', composition: ['outline'], significance: 'Neon signage company — outline letterform reflecting luminous tube construction.', bookPageHint: 'Case study: Claude Neon' }),
  entry({ id: 'ref-case-dtv', name: 'Deutscher Taschenbuch Verlag (DTV)', designer: 'Wolfgang Weingart', year: 1971, country: 'Germany', chapter: 'typographic', section: 'opened-up-letters', industry: 'media', era: '1970s', markType: 'lettermark', entryKind: 'case_study', typography: ['constructed'], significance: 'Publisher identity — deconstructed letterforms representing Swiss typography revolution in paperback publishing.', bookPageHint: 'Case study: DTV', principleIds: ['typ-custom-letterform', 'era-1970s'] }),

  // ── Designer Profiles (book featured) ──
  entry({ id: 'ref-designer-paul-rand', name: 'Paul Rand', year: 1914, country: 'USA', chapter: 'geometric', section: 'lines', industry: 'consulting', era: 'corporate_identity', entryKind: 'designer_profile', significance: 'Master of American corporate identity. IBM, ABC, UPS, Westinghouse, NeXT. Pioneered systematic logo design integrating wit with geometric rigor.', principleIds: ['insp-ibm', 'era-corporate-identity', 'con-equal-width-lines'] }),
  entry({ id: 'ref-designer-yusaku-kamekura', name: 'Yusaku Kamekura', year: 1915, country: 'Japan', chapter: 'geometric', section: 'circle', industry: 'consulting', era: '1960s', entryKind: 'designer_profile', significance: 'Tokyo 1964 Olympics identity, Daiei, Nippon Telegraph. Bridged Japanese aesthetics with International Typographic Style.', principleIds: ['era-1960s', 'geo-circle'] }),
  entry({ id: 'ref-designer-anton-stankowski', name: 'Anton Stankowski', year: 1906, country: 'Germany', chapter: 'geometric', section: 'triangle', industry: 'consulting', era: 'swiss', entryKind: 'designer_profile', significance: 'Deutsche Bank logo, Atlas Film, Münchner Rückversicherung. Founded constructive design school in Stuttgart.', principleIds: ['geo-triangle', 'era-swiss', 'con-modular-grid'] }),
  entry({ id: 'ref-designer-karol-sliwka', name: 'Karol Śliwka', year: 1932, country: 'Poland', chapter: 'geometric', section: 'basic-forms', industry: 'consulting', era: 'international_style', entryKind: 'designer_profile', significance: 'Polish modernist designer. KOMA, LOT Polish Airlines. Geometric reduction in Eastern European corporate identity.' }),
  entry({ id: 'ref-designer-burton-kramer', name: 'Burton Kramer', year: 1938, country: 'Canada', chapter: 'geometric', section: 'radiating', industry: 'consulting', era: '1970s', entryKind: 'designer_profile', significance: 'CBC (Canadian Broadcasting Corporation) radiating C logo. Colorful systematic identity for public media.' }),
  entry({ id: 'ref-designer-stefan-kanchev', name: 'Stefan Kanchev', year: 1915, country: 'Bulgaria', chapter: 'geometric', section: 'figurative', industry: 'consulting', era: 'international_style', entryKind: 'designer_profile', significance: 'Prolific Bulgarian logo designer. Hundreds of trademarks with folk-art-meets-modernism geometric vocabulary.' }),
  entry({ id: 'ref-designer-paul-ibou', name: 'Paul Ibou', year: 1939, country: 'Belgium', chapter: 'typographic', section: 'words', industry: 'consulting', era: '1970s', entryKind: 'designer_profile', significance: 'Belgian graphic designer. Wordmark specialist with systematic typographic construction for European corporations.' }),
  entry({ id: 'ref-designer-adrian-frutiger', name: 'Adrian Frutiger', year: 1928, country: 'Switzerland', chapter: 'typographic', section: 'a-to-z', industry: 'consulting', era: 'swiss', entryKind: 'designer_profile', significance: 'Frutiger and Univers typefaces. Charles de Gaulle Airport signage. Defined humanist sans-serif for wayfinding systems.', principleIds: ['typ-swiss-typography', 'typ-humanist-sans', 'era-swiss'] }),

  // ── Additional canonical marks (cross-section coverage) ──
  entry({ id: 'ref-ups', name: 'UPS', designer: 'Paul Rand', year: 1961, country: 'USA', chapter: 'typographic', section: 'three-letters', industry: 'logistics', era: 'corporate_identity', markType: 'lettermark', geometry: ['shield', 'bow', 'package'], shape: ['shield'], construction: ['modular-grid', 'geometric-reduction'], composition: ['symmetry', 'emblem-container'], typography: ['geometric-sans', 'bold-lettermark'], significance: 'Shield with package bow — Rand delivery identity.', principleIds: ['era-corporate-identity', 'mark-lettermark', 'typ-letter-combination', 'typ-geometric-sans', 'comp-symmetry', 'con-modular-grid', 'cx-minimal-complexity', 'render-flat-vector'] }),
  entry({ id: 'ref-chase', name: 'Chase Bank', designer: 'Chermayeff & Geismar', year: 1961, country: 'USA', chapter: 'geometric', section: 'basic-forms', industry: 'finance', era: 'corporate_identity', markType: 'symbol', geometry: ['octagon'], significance: 'Blue octagon — abstract financial symbol without literal reference.' }),
  entry({ id: 'ref-deutsche-bank', name: 'Deutsche Bank', designer: 'Anton Stankowski', year: 1974, country: 'Germany', chapter: 'geometric', section: 'slash', industry: 'finance', era: 'swiss', markType: 'symbol', geometry: ['square'], composition: ['diagonal'], significance: 'Slash in square — Stankowski banking trust mark.' }),
  entry({ id: 'ref-tokyo-64', name: 'Tokyo Olympics 1964', designer: 'Yusaku Kamekura', year: 1964, country: 'Japan', chapter: 'geometric', section: 'circle', industry: 'sports', era: '1960s', markType: 'emblem', geometry: ['circle'], colorCount: 2, significance: 'Red sun with Olympic rings — Japanese modernist Olympic identity.' }),
  entry({ id: 'ref-volkswagen', name: 'Volkswagen', designer: 'Hans Hilse', year: 1967, country: 'Germany', chapter: 'geometric', section: 'circle', industry: 'automotive', era: 'corporate_identity', markType: 'lettermark', geometry: ['circle'], typography: ['geometric-sans'], significance: 'VW in circle — automotive lettermark in circular container.' }),
  entry({ id: 'ref-mcdonalds', name: "McDonald's Golden Arches", designer: 'Jim Schindler', year: 1962, country: 'USA', chapter: 'geometric', section: 'round', industry: 'food', era: '1960s', markType: 'symbol', geometry: ['arch'], significance: 'Arch-based geometric construction — architectural curve as modernist structure.' }),
  entry({ id: 'ref-nike', name: 'Nike Swoosh', designer: 'Carolyn Davidson', year: 1971, country: 'USA', chapter: 'geometric', section: 'skewed', industry: 'sports', era: '1970s', markType: 'symbol', geometry: ['curve'], significance: 'Motion curve — dynamic skewed checkmark.' }),
  entry({ id: 'ref-apple', name: 'Apple', designer: 'Rob Janoff', year: 1977, country: 'USA', chapter: 'geometric', section: 'figurative', industry: 'technology', era: '1970s', markType: 'symbol', geometry: ['apple'], significance: 'Bitten apple silhouette — figurative tech symbolism.' }),
  entry({ id: 'ref-mercedes', name: 'Mercedes-Benz', year: 1926, country: 'Germany', chapter: 'geometric', section: 'triangle', industry: 'automotive', era: 'corporate_identity', markType: 'symbol', geometry: ['star', 'circle'], composition: ['radial'], significance: 'Three-pointed star in circle — automotive luxury radial mark.' }),
  entry({ id: 'ref-porsche', name: 'Porsche', year: 1952, country: 'Germany', chapter: 'geometric', section: 'shield', industry: 'automotive', era: 'corporate_identity', markType: 'emblem', geometry: ['shield'], visualComplexity: 'medium', significance: 'Stuttgart coat of arms modernized — heraldic emblem simplification.' }),
  entry({ id: 'ref-bmw', name: 'BMW', year: 1929, country: 'Germany', chapter: 'geometric', section: 'circle', industry: 'automotive', era: 'corporate_identity', markType: 'symbol', geometry: ['circle'], composition: ['quadrant'], colorCount: 2, significance: 'Quartered circle — propeller myth, Bavarian color reference.' }),
  entry({ id: 'ref-renault', name: 'Renault', designer: 'Victor Vasarely', year: 1972, country: 'France', chapter: 'geometric', section: 'diamond', industry: 'automotive', era: '1970s', markType: 'symbol', geometry: ['diamond'], significance: 'Diamond badge — Vasarely-influenced automotive geometry.' }),
  entry({ id: 'ref-minolta', name: 'Minolta', designer: 'Saul Bass', year: 1981, country: 'Japan', chapter: 'geometric', section: 'circle', industry: 'technology', era: '1970s', markType: 'symbol', geometry: ['circle'], significance: 'Rising sun circle — Bass optical company mark.' }),
  entry({ id: 'ref-at-and-t', name: 'AT&T', designer: 'Saul Bass', year: 1983, country: 'USA', chapter: 'geometric', section: 'lines', industry: 'telecom', era: 'corporate_identity', markType: 'symbol', geometry: ['globe', 'lines'], composition: ['latitudinal'], significance: 'Globe with latitude lines — telecommunications world mark.' }),
  entry({ id: 'ref-united', name: 'United Airlines', designer: 'Saul Bass', year: 1974, country: 'USA', chapter: 'geometric', section: 'basic-forms', industry: 'aviation', era: 'corporate_identity', markType: 'symbol', geometry: ['tulip'], significance: 'Tulip U form — Bass airline identity redesign.' }),
  entry({ id: 'ref-bell-system', name: 'Bell System', designer: 'Saul Bass', year: 1969, country: 'USA', chapter: 'geometric', section: 'bell', industry: 'telecom', era: 'corporate_identity', markType: 'symbol', geometry: ['bell'], significance: 'Bell icon — literal form reduced to geometric essence.' }),
  entry({ id: 'ref-pbs', name: 'PBS', designer: 'Chermayeff & Geismar', year: 1971, country: 'USA', chapter: 'typographic', section: 'three-letters', industry: 'media', era: 'corporate_identity', markType: 'lettermark', significance: 'PBS profile faces — abstracted human forms in lettermark.' }),
  entry({ id: 'ref-national-geographic', name: 'National Geographic', year: 1967, country: 'USA', chapter: 'effect', section: 'frame', industry: 'media', era: 'corporate_identity', markType: 'symbol', geometry: ['rectangle'], composition: ['frame'], colorCount: 2, significance: 'Yellow rectangle frame — portal/viewfinder brand device.' }),
  entry({ id: 'ref-starbucks', name: 'Starbucks', year: 1971, country: 'USA', chapter: 'geometric', section: 'figurative', industry: 'coffee', era: '1970s', markType: 'emblem', geometry: ['circle'], visualComplexity: 'medium', significance: 'Siren in circle — figurative emblem for coffee retail.' }),
  entry({ id: 'ref-ikea', name: 'IKEA', designer: 'Karlsson & Kempe', year: 1967, country: 'Sweden', chapter: 'typographic', section: 'words', industry: 'retail', era: '1960s', markType: 'wordmark', typography: ['geometric-sans'], colorCount: 2, significance: 'Blue/yellow wordmark in oval — Scandinavian retail identity.' }),
  entry({ id: 'ref-hm', name: 'H&M', year: 1968, country: 'Sweden', chapter: 'typographic', section: 'two-letters', industry: 'fashion', era: '1960s', markType: 'lettermark', significance: 'H&M lettermark — Swedish fast fashion typography.' }),
  entry({ id: 'ref-unilever', name: 'Unilever', designer: 'Wolff Olins', year: 2004, country: 'UK', chapter: 'geometric', section: 'figurative', industry: 'retail', era: 'corporate_identity', markType: 'symbol', visualComplexity: 'high', significance: 'U composed of brand icons — figurative composite mark.' }),
  entry({ id: 'ref-woolmark', name: 'Woolmark', designer: 'Franco Grignani', year: 1964, country: 'International', chapter: 'geometric', section: 'lines', industry: 'retail', era: '1960s', markType: 'symbol', geometry: ['spiral'], significance: 'Five black bands — textile quality spiral mark.' }),
  entry({ id: 'ref-radioshack', name: 'RadioShack', year: 1962, country: 'USA', chapter: 'typographic', section: 'words', industry: 'retail', era: '1960s', markType: 'wordmark', significance: 'Script wordmark — electronics retail typography.' }),
  entry({ id: 'ref-siemens', name: 'Siemens', year: 1973, country: 'Germany', chapter: 'typographic', section: 'words', industry: 'technology', era: '1970s', markType: 'wordmark', typography: ['geometric-sans'], significance: 'Bold SIEMENS wordmark — German industrial typography.' }),
  entry({ id: 'ref-philips', name: 'Philips', year: 1968, country: 'Netherlands', chapter: 'typographic', section: 'words', industry: 'technology', era: '1960s', markType: 'wordmark', typography: ['geometric-sans'], significance: 'Shield-contained wordmark — Dutch electronics identity.' }),
  entry({ id: 'ref-pan-am', name: 'Pan Am', designer: 'Edward Larrabee Barnes', year: 1958, country: 'USA', chapter: 'geometric', section: 'globe', industry: 'aviation', era: 'corporate_identity', markType: 'symbol', geometry: ['globe'], significance: 'Blue globe — jet-age aviation identity archetype.' }),
  entry({ id: 'ref-twa', name: 'TWA', designer: 'Unimark', year: 1962, country: 'USA', chapter: 'typographic', section: 'three-letters', industry: 'aviation', era: 'corporate_identity', markType: 'lettermark', significance: 'TWA lettermark — Unimark airline identity system.' }),
  entry({ id: 'ref-swiss-rail', name: 'Swiss Federal Railways', designer: 'Hans Hartmann', year: 1980, country: 'Switzerland', chapter: 'geometric', section: 'arrow', industry: 'logistics', era: 'swiss', markType: 'symbol', geometry: ['arrow'], colorCount: 2, significance: 'Red arrow in white cross — Swiss railway navigation mark.' }),
  entry({ id: 'ref-moMA', name: 'MoMA', designer: 'Ivan Chermayeff', year: 1964, country: 'USA', chapter: 'typographic', section: 'words', industry: 'education', era: 'swiss', markType: 'wordmark', typography: ['geometric-sans'], significance: 'MoMA wordmark — museum as typographic institution.' }),
  entry({ id: 'ref-london-underground', name: 'London Underground', designer: 'Edward Johnston', year: 1916, country: 'UK', chapter: 'typographic', section: 'words', industry: 'logistics', era: 'international_style', markType: 'symbol', geometry: ['circle', 'bar'], significance: 'Roundel — circle-bar transit symbol, foundational wayfinding mark.' }),
  entry({ id: 'ref-new-york-subway', name: 'NYC Subway', designer: 'Unimark / Vignelli', year: 1968, country: 'USA', chapter: 'typographic', section: 'words', industry: 'logistics', era: 'swiss', markType: 'symbol', typography: ['helvetica-style'], significance: 'Helvetica signage system — Swiss typography applied to urban transit.' }),
];

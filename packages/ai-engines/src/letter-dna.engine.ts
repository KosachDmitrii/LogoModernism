export interface LetterDNAInput {
  text: string;
  style?: 'geometric' | 'humanist' | 'grotesque' | 'monoline' | 'custom';
  emphasis?: 'first' | 'last' | 'middle' | 'all' | 'none';
}

export interface LetterAnalysis {
  character: string;
  index: number;
  formType: 'vertical' | 'horizontal' | 'diagonal' | 'curved' | 'compound' | 'symmetric';
  strokeCount: number;
  negativeSpacePotential: number;
  monogramCandidate: boolean;
  constructionHint: string;
  psychologyTag: string;
}

export interface LetterDNAProfile {
  text: string;
  letters: LetterAnalysis[];
  monogramOptions: string[];
  ligatureOpportunities: string[];
  balanceAxis: 'vertical' | 'horizontal' | 'diagonal';
  recommendedWeight: 'light' | 'regular' | 'bold' | 'black';
  counterSpaceStrategy: string;
  customLetterformIdeas: string[];
}

const LETTER_FORMS: Record<string, Omit<LetterAnalysis, 'character' | 'index'>> = {
  A: { formType: 'diagonal', strokeCount: 3, negativeSpacePotential: 8, monogramCandidate: true, constructionHint: 'Apex triangle with crossbar', psychologyTag: 'ascent' },
  B: { formType: 'compound', strokeCount: 2, negativeSpacePotential: 7, monogramCandidate: true, constructionHint: 'Vertical stem with dual bowls', psychologyTag: 'structure' },
  C: { formType: 'curved', strokeCount: 1, negativeSpacePotential: 6, monogramCandidate: true, constructionHint: 'Open arc with optical correction', psychologyTag: 'openness' },
  D: { formType: 'compound', strokeCount: 2, negativeSpacePotential: 5, monogramCandidate: true, constructionHint: 'Stem with semicircular bowl', psychologyTag: 'containment' },
  E: { formType: 'horizontal', strokeCount: 4, negativeSpacePotential: 4, monogramCandidate: false, constructionHint: 'Three equal horizontal arms', psychologyTag: 'clarity' },
  F: { formType: 'horizontal', strokeCount: 3, negativeSpacePotential: 3, monogramCandidate: false, constructionHint: 'Vertical with two arms', psychologyTag: 'directness' },
  G: { formType: 'curved', strokeCount: 2, negativeSpacePotential: 7, monogramCandidate: true, constructionHint: 'C-form with inward spur', psychologyTag: 'completeness' },
  H: { formType: 'vertical', strokeCount: 3, negativeSpacePotential: 5, monogramCandidate: true, constructionHint: 'Dual verticals with crossbar', psychologyTag: 'stability' },
  I: { formType: 'vertical', strokeCount: 1, negativeSpacePotential: 2, monogramCandidate: false, constructionHint: 'Single vertical stroke', psychologyTag: 'simplicity' },
  J: { formType: 'curved', strokeCount: 1, negativeSpacePotential: 4, monogramCandidate: false, constructionHint: 'Descender with hook', psychologyTag: 'flow' },
  K: { formType: 'diagonal', strokeCount: 3, negativeSpacePotential: 6, monogramCandidate: true, constructionHint: 'Stem with dual diagonals', psychologyTag: 'dynamism' },
  L: { formType: 'horizontal', strokeCount: 2, negativeSpacePotential: 3, monogramCandidate: false, constructionHint: 'Vertical with base arm', psychologyTag: 'foundation' },
  M: { formType: 'diagonal', strokeCount: 4, negativeSpacePotential: 5, monogramCandidate: true, constructionHint: 'Dual peaks from baseline', psychologyTag: 'strength' },
  N: { formType: 'diagonal', strokeCount: 3, negativeSpacePotential: 5, monogramCandidate: true, constructionHint: 'Diagonal connecting verticals', psychologyTag: 'connection' },
  O: { formType: 'curved', strokeCount: 1, negativeSpacePotential: 9, monogramCandidate: true, constructionHint: 'Perfect oval or circle', psychologyTag: 'wholeness' },
  P: { formType: 'compound', strokeCount: 2, negativeSpacePotential: 6, monogramCandidate: true, constructionHint: 'Stem with closed bowl', psychologyTag: 'precision' },
  Q: { formType: 'curved', strokeCount: 2, negativeSpacePotential: 8, monogramCandidate: true, constructionHint: 'O-form with tail', psychologyTag: 'uniqueness' },
  R: { formType: 'compound', strokeCount: 2, negativeSpacePotential: 6, monogramCandidate: true, constructionHint: 'P-form with diagonal leg', psychologyTag: 'authority' },
  S: { formType: 'curved', strokeCount: 1, negativeSpacePotential: 7, monogramCandidate: true, constructionHint: 'Dual curve with optical balance', psychologyTag: 'fluidity' },
  T: { formType: 'horizontal', strokeCount: 2, negativeSpacePotential: 4, monogramCandidate: true, constructionHint: 'Crossbar on centered stem', psychologyTag: 'balance' },
  U: { formType: 'curved', strokeCount: 1, negativeSpacePotential: 5, monogramCandidate: false, constructionHint: 'Open bowl with flat top', psychologyTag: 'support' },
  V: { formType: 'diagonal', strokeCount: 2, negativeSpacePotential: 5, monogramCandidate: true, constructionHint: 'Converging diagonals', psychologyTag: 'convergence' },
  W: { formType: 'diagonal', strokeCount: 4, negativeSpacePotential: 4, monogramCandidate: true, constructionHint: 'Dual V-forms', psychologyTag: 'breadth' },
  X: { formType: 'diagonal', strokeCount: 2, negativeSpacePotential: 7, monogramCandidate: true, constructionHint: 'Crossing diagonals at center', psychologyTag: 'intersection' },
  Y: { formType: 'diagonal', strokeCount: 3, negativeSpacePotential: 6, monogramCandidate: true, constructionHint: 'Fork with single descender', psychologyTag: 'branching' },
  Z: { formType: 'horizontal', strokeCount: 3, negativeSpacePotential: 5, monogramCandidate: true, constructionHint: 'Horizontal with diagonal', psychologyTag: 'energy' },
};

export function analyzeLetterDNA(input: LetterDNAInput): LetterDNAProfile {
  const chars = input.text.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const letters: LetterAnalysis[] = chars.map((char, index) => ({
    character: char,
    index,
    ...(LETTER_FORMS[char] ?? {
      formType: 'compound' as const,
      strokeCount: 2,
      negativeSpacePotential: 5,
      monogramCandidate: false,
      constructionHint: 'Custom letterform',
      psychologyTag: 'neutral',
    }),
  }));

  const monogramCandidates = letters.filter((l) => l.monogramCandidate);
  const monogramOptions = buildMonogramOptions(chars, monogramCandidates);

  const ligatureOpportunities = findLigatures(chars);
  const balanceAxis = inferBalanceAxis(letters);
  const recommendedWeight = input.style === 'monoline' ? 'regular' : chars.length <= 3 ? 'bold' : 'regular';

  return {
    text: input.text,
    letters,
    monogramOptions,
    ligatureOpportunities,
    balanceAxis,
    recommendedWeight,
    counterSpaceStrategy: letters.some((l) => l.negativeSpacePotential >= 7)
      ? 'Exploit counter-space for hidden symbolism'
      : 'Maintain open counters for legibility',
    customLetterformIdeas: buildCustomIdeas(letters, input.style),
  };
}

function buildMonogramOptions(chars: string[], candidates: LetterAnalysis[]): string[] {
  const options: string[] = [];
  if (chars.length >= 2) {
    options.push(chars.slice(0, 2).join(''));
    options.push(chars[0] + chars[chars.length - 1]);
  }
  if (candidates.length >= 1) options.push(candidates[0].character);
  if (chars.length >= 3) options.push(chars.slice(0, 3).join(''));
  return [...new Set(options)];
}

function findLigatures(chars: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    const pair = chars[i] + chars[i + 1];
    if (['AV', 'AW', 'LL', 'OO', 'TT', 'FI', 'FL'].includes(pair)) {
      pairs.push(pair);
    }
  }
  return pairs;
}

function inferBalanceAxis(letters: LetterAnalysis[]): LetterDNAProfile['balanceAxis'] {
  const counts = { vertical: 0, horizontal: 0, diagonal: 0 };
  for (const l of letters) {
    if (l.formType === 'vertical') counts.vertical++;
    if (l.formType === 'horizontal') counts.horizontal++;
    if (l.formType === 'diagonal') counts.diagonal++;
  }
  if (counts.diagonal >= counts.vertical && counts.diagonal >= counts.horizontal) return 'diagonal';
  if (counts.horizontal > counts.vertical) return 'horizontal';
  return 'vertical';
}

function buildCustomIdeas(letters: LetterAnalysis[], style?: LetterDNAInput['style']): string[] {
  const ideas: string[] = [];
  const highNeg = letters.filter((l) => l.negativeSpacePotential >= 7);
  if (highNeg.length) ideas.push(`Integrate negative space in ${highNeg.map((l) => l.character).join(', ')}`);
  if (style === 'geometric') ideas.push('Construct letterforms from grid modules');
  if (style === 'monoline') ideas.push('Single continuous stroke connecting letters');
  if (letters.length <= 2) ideas.push('Oversized monogram with minimal supporting elements');
  return ideas;
}

import type { ResolvedBrief } from './types';
import { deriveRebusWordmark } from '@logo-platform/shared';

export type TypographicTechnique =
  | 'negative_space_silhouette'
  | 'letter_as_image'
  | 'figure_ground_rebus';

export interface TypographicIntegration {
  technique: TypographicTechnique;
  targetLetter: string;
  subject: string;
  promptLine: string;
}

const INTEGRATION_SIGNAL =
  /negative\s*space|figure[- ]ground|rebus|silhouette|letterform\s+integration|typographic\s+trick|letter\s+as\s+(?:image|form)|inside\s+(?:the\s+)?letter|glyph\s+integration/i;

const SUBJECT_WORD = /\b(cat|dog|fox|bee|owl|fish|bear|bird|rabbit|mouse|lion|tiger|whale|shark|frog|snake|horse|pig|cow|sheep|duck|penguin)\b/i;

const EXPLICIT_IN_LETTER =
  /(?:letter|glyph|character)\s+['"]?([a-z])['"]?\s+(?:contains?|forms?|shows?|hides?|integrates?|carves?)\s+(?:a\s+)?([a-z][a-z\s-]{1,20}?)(?:\s+silhouette)?(?:\s+via|\s+using|\s+through|\s+inside|$)/i;

const EXPLICIT_SUBJECT_IN_LETTER =
  /([a-z][a-z\s-]{1,20}?)\s+silhouette\s+(?:inside|in|within)\s+(?:letter|glyph)\s+['"]?([a-z])['"]?/i;

const NAME_TO_SUBJECT: Record<string, string> = {
  cat: 'cat',
  dog: 'dog',
  fox: 'fox',
  bee: 'bee',
  owl: 'owl',
  fish: 'fish',
  bear: 'bear',
  bird: 'bird',
};

function briefHaystack(brief: ResolvedBrief): string {
  return [
    brief.clientNotes,
    brief.composition,
    brief.construction,
    brief.companyName,
  ]
    .filter(Boolean)
    .join(' ');
}

function inferSubjectFromName(companyName?: string): string | undefined {
  if (!companyName?.trim()) return undefined;
  const lower = companyName.trim().toLowerCase();
  if (NAME_TO_SUBJECT[lower]) return NAME_TO_SUBJECT[lower];

  const match = lower.match(SUBJECT_WORD);
  return match?.[1];
}

function pickTargetLetter(companyName: string, subject: string): string {
  const lower = companyName.trim().toLowerCase();
  const first = lower[0];
  if (!first) return subject[0] ?? 'a';

  if (lower.includes(first) && subject.startsWith(first)) return first;
  if (subject === 'cat' && lower.includes('c')) return 'c';
  if (subject === 'dog' && lower.includes('d')) return 'd';
  if (subject === 'fox' && lower.includes('f')) return 'f';
  if (subject === 'bee' && lower.includes('b')) return 'b';
  if (subject === 'owl' && lower.includes('o')) return 'o';
  if (subject === 'fish' && lower.includes('f')) return 'f';

  return first;
}

function buildPromptLine(
  technique: TypographicTechnique,
  targetLetter: string,
  subject: string,
  companyName: string,
): string {
  const readable = `text must still read exactly '${companyName}' letter-for-letter`;
  switch (technique) {
    case 'figure_ground_rebus':
      return (
        `rebus wordmark where letter '${targetLetter}' and ${subject} silhouette share one outline via figure-ground reversal, ${readable}`
      );
    case 'letter_as_image':
      return (
        `letter '${targetLetter}' doubles as ${subject} form — letterform and ${subject} are one unified shape, ${readable}`
      );
    default:
      return (
        `${subject} silhouette carved inside letter '${targetLetter}' via negative space, ` +
        `letterform outline stays intact, ${readable}`
      );
  }
}

function parseExplicitIntegration(haystack: string): { letter: string; subject: string } | undefined {
  const inLetter = haystack.match(EXPLICIT_IN_LETTER);
  if (inLetter) {
    return {
      letter: inLetter[1]!.toLowerCase(),
      subject: inLetter[2]!.trim().toLowerCase().replace(/\s+/g, ' '),
    };
  }

  const subjectInLetter = haystack.match(EXPLICIT_SUBJECT_IN_LETTER);
  if (subjectInLetter) {
    return {
      subject: subjectInLetter[1]!.trim().toLowerCase(),
      letter: subjectInLetter[2]!.toLowerCase(),
    };
  }

  return undefined;
}

function inferTechnique(haystack: string): TypographicTechnique {
  if (/figure[- ]ground|rebus/i.test(haystack)) return 'figure_ground_rebus';
  if (/letter\s+as\s+(?:image|form)|doubles?\s+as/i.test(haystack)) return 'letter_as_image';
  return 'negative_space_silhouette';
}

export function detectTypographicIntegration(
  brief: ResolvedBrief,
): TypographicIntegration | undefined {
  const companyName = brief.companyName?.trim();
  if (!companyName) return undefined;

  const haystack = briefHaystack(brief).toLowerCase();
  const explicit = parseExplicitIntegration(haystack);
  const hasSignal =
    INTEGRATION_SIGNAL.test(haystack) || deriveRebusWordmark(brief.typographyStyle, brief.rebusWordmark);
  const subjectFromName = inferSubjectFromName(companyName);
  const shortName = companyName.length <= 8;

  if (!deriveRebusWordmark(brief.typographyStyle, brief.rebusWordmark) && !explicit && !hasSignal && !(shortName && subjectFromName)) {
    return undefined;
  }

  const subject =
    explicit?.subject ??
    (SUBJECT_WORD.exec(haystack)?.[1]?.toLowerCase()) ??
    subjectFromName ??
    (deriveRebusWordmark(brief.typographyStyle, brief.rebusWordmark) ? 'brand motif' : undefined);

  if (!subject) return undefined;

  const targetLetter = explicit?.letter ?? pickTargetLetter(companyName, subject);
  const technique = inferTechnique(haystack);

  return {
    technique,
    targetLetter,
    subject,
    promptLine: buildPromptLine(technique, targetLetter, subject, companyName),
  };
}

export function typographicAvoidExtras(): string[] {
  return [
    'separate clipart icon beside text',
    'illustration disconnected from letterforms',
    'literal mascot floating next to wordmark',
  ];
}

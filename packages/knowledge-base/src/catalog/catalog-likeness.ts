import type { LogoReference } from '@logo-platform/shared';
import { LOGO_CATALOG } from './entries';

/**
 * Famous / protected marks — structure & principles only, never likeness language.
 * Covers curated catalog trademarks (names as they appear in LOGO_CATALOG).
 */
export const HIGH_RISK_TRADEMARK_NAMES =
  /\b(?:mcdonald'?s|golden arches|nike|swoosh|apple|starbucks|lufthansa|adidas|coca.?cola|fedex|shell|target|bmw|mercedes(?:-benz)?|porsche|chanel|olympics?|olympic rings|cbs|abc|ibm|ups|audi|volkswagen|vw\b|mitsubishi|playboy|nasa|microsoft|bbc|mtv|cnn|google|hp\b|ge\b|fiat|renault|citro[eë]n|chevron|bayer|westinghouse|esso|mobil|texaco|nbc|woolmark|ikea|h&m|unilever|siemens|philips|pan am|twa|moma|chase|deutsche bank|at&t|bell system|pbs|national geographic|united airlines|british airways|japan airlines|nikon|alcoa|cadillac|motorola|al jazeera|asics|panasonic|visa|mastercard|pepsi|twitter|facebook|instagram|youtube|netflix|spotify|uber|airbnb|tesla|ford|toyota|honda|ferrari|lamborghini|gucci|prada|dior|herm[eè]s|louis vuitton|lv\b|burberry|lacoste|puma|reebok|xerox|sony|amazon|meta)\b/i;

/** Distinctive trademark form language that must never drive generation. */
const TRADEMARK_LIKENESS_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\boutlined interlocking\s*c'?s\b/gi, replacement: 'contour-only interlocking letter geometry' },
  { pattern: /\binterlocking\s*c'?s\b/gi, replacement: 'interlocking dual-letter geometry' },
  { pattern: /\bcontour-only luxury treatment\b/gi, replacement: 'contour-only geometric treatment' },
  { pattern: /\bluxury monogram as geometric pattern\b/gi, replacement: 'modular geometric letter construction' },
  { pattern: /\bgolden arches\b/gi, replacement: 'arch-inspired geometric construction' },
  { pattern: /\bnike swoosh\b/gi, replacement: 'Nike motion curve' },
  { pattern: /\bswoosh\b/gi, replacement: 'dynamic motion curve' },
  { pattern: /\bbitten apple(?:\s+silhouette)?\b/gi, replacement: 'reduced figurative silhouette construction' },
  { pattern: /\bsiren in circle\b/gi, replacement: 'figurative emblem in circular container' },
  { pattern: /\bthree-stripe mountain arrow\b/gi, replacement: 'stacked directional stripe geometry' },
  { pattern: /\bfive interlocking rings\b/gi, replacement: 'duplicated circular module system' },
  { pattern: /\bfour interlocking rings\b/gi, replacement: 'serial circular module linkage' },
  { pattern: /\bcrane in circle\b/gi, replacement: 'negative-space bird form in circular container' },
  { pattern: /\bscallop shell\b/gi, replacement: 'organic cut-off contour form' },
  { pattern: /\bmeatball emblem\b/gi, replacement: 'aerospace overlay emblem geometry' },
  { pattern: /\beye in circle\b/gi, replacement: 'circular iris geometric symbol' },
  { pattern: /\brabbit profile\b/gi, replacement: 'reduced figurative contour silhouette' },
  { pattern: /\bpanda silhouette\b/gi, replacement: 'reduced figurative silhouette geometry' },
  { pattern: /\bthree-diamond(?: angular arrangement| system)?\b/gi, replacement: 'tri-module angular diamond geometry' },
  { pattern: /\bthree-pointed star in circle\b/gi, replacement: 'radial star-in-circle geometry' },
  { pattern: /\bstuttgart coat of arms\b/gi, replacement: 'heraldic emblem reduction' },
  { pattern: /\bquartered circle\b/gi, replacement: 'sector-divided circular geometry' },
  { pattern: /\bfour-square window\b/gi, replacement: 'four-module square grid' },
  { pattern: /\bshield with package bow\b/gi, replacement: 'shield container geometric mark' },
  { pattern: /\barrow in negative space\b/gi, replacement: 'hidden figure-ground directional cue' },
  { pattern: /\bcolor feather overlay\b/gi, replacement: 'spectral overlay feather geometry' },
  { pattern: /\bas brand symbol\b/gi, replacement: 'as geometric structure' },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSignificance(value: string): string {
  return value.trim().replace(/\.+$/, '').replace(/\s+/g, ' ');
}

function buildSignificanceList(entries: Array<Pick<LogoReference, 'significance'>>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const sig = normalizeSignificance(entry.significance ?? '');
    if (sig.length < 12) continue;
    const key = sig.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sig);
  }
  out.sort((a, b) => b.length - a.length);
  return out;
}

let catalogSignificanceCorpus = buildSignificanceList(LOGO_CATALOG);
let highRiskSignificanceSet = new Set(
  LOGO_CATALOG.filter((e) => isHighRiskCatalogEntry(e))
    .map((e) => normalizeSignificance(e.significance ?? '').toLowerCase())
    .filter((s) => s.length >= 12),
);

/** Expand scrub corpus with full catalog (curated + imported). Call once after catalog load. */
export function setCatalogSignificanceCorpus(entries: Array<Pick<LogoReference, 'name' | 'significance'>>): void {
  catalogSignificanceCorpus = buildSignificanceList(entries);
  highRiskSignificanceSet = new Set(
    entries
      .filter((e) => isHighRiskCatalogEntry(e))
      .map((e) => normalizeSignificance(e.significance ?? '').toLowerCase())
      .filter((s) => s.length >= 12),
  );
}

export function isHighRiskCatalogEntry(ref: Pick<LogoReference, 'name' | 'significance'>): boolean {
  return (
    HIGH_RISK_TRADEMARK_NAMES.test(ref.name) ||
    HIGH_RISK_TRADEMARK_NAMES.test(ref.significance ?? '')
  );
}

/** Soften trademark likeness phrases while keeping usable structure language. */
export function softenTrademarkLikenessLanguage(text: string): string {
  let result = text;
  for (const { pattern, replacement } of TRADEMARK_LIKENESS_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result
    .replace(/\bgeometric-led geometric\b/gi, 'geometric-led')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Drop Design brief notes that are raw catalog significances (esp. high-risk trademarks).
 * Remaining notes are still softened for likeness language.
 */
export function scrubCatalogSignificanceLeaks(text: string): string {
  let result = text;

  for (const significance of catalogSignificanceCorpus) {
    const escaped = escapeRegExp(significance);
    const noteRe = new RegExp(`\\bDesign brief note:\\s*${escaped}\\.?`, 'gi');
    result = result.replace(noteRe, '');
  }

  result = result
    .split(/(?<=\.)\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => {
      if (!clause) return false;
      const body = clause.replace(/^Design brief note:\s*/i, '');
      if (highRiskSignificanceSet.has(normalizeSignificance(body).toLowerCase())) return false;
      if (/interlocking\s*c'?s|golden arches|\bswoosh\b|bitten apple|siren in circle|meatball emblem/i.test(body)) {
        return false;
      }
      return true;
    })
    .join(' ');

  result = softenTrademarkLikenessLanguage(result);

  // Keep first Industry direction only (interview + composition can append a second).
  {
    let seenIndustry = false;
    result = result.replace(/\bIndustry direction for [^:]+:[^.]+(?:\.|$)/gi, (match) => {
      if (seenIndustry) return '';
      seenIndustry = true;
      return match;
    });
  }

  // Drop Design brief notes that are leftover softened catalog likeness dumps.
  result = result
    .split(/(?<=\.)\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => {
      if (!/^Design brief note:/i.test(clause)) return true;
      const body = clause.replace(/^Design brief note:\s*/i, '');
      if (/interlocking (?:dual-?letter|letter) geometry|contour-only geometric treatment|arch-inspired geometric construction|dynamic motion curve|reduced figurative silhouette/i.test(body)) {
        return false;
      }
      return true;
    })
    .join(' ');

  return result.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').trim();
}

/**
 * Narrative from catalog UI often equals entry.significance — strip high-risk
 * likeness dumps; soften anything leftover.
 */
export function sanitizeCatalogNarrativeForPrompt(narrative: string): string {
  const trimmed = normalizeSignificance(narrative);
  if (!trimmed) return '';

  if (highRiskSignificanceSet.has(trimmed.toLowerCase())) return '';
  if (catalogSignificanceCorpus.some((sig) => sig.toLowerCase() === trimmed.toLowerCase())) {
    return '';
  }

  return softenTrademarkLikenessLanguage(trimmed);
}

/** Soft geometry / composition labels for high-risk marks. */
export function softGeometryLabels(geometry: string[]): string[] {
  return geometry.map((g) => {
    if (g === 'arch') return 'curve, arch-inspired construction';
    if (g === 'interlocking') return 'modular interlocking construction';
    if (g === 'eye') return 'circular focal geometry';
    if (g === 'rabbit') return 'reduced figurative contour';
    if (g === 'feather') return 'radial feather-module geometry';
    return g;
  });
}

export function softCompositionLabels(composition: string[]): string[] {
  return composition.map((c) => {
    if (c === 'interlocking') return 'linked modular composition';
    if (c === 'outline') return 'contour-only construction';
    return c;
  });
}

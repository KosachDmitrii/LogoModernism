const TYPO_LAB_FRAGMENT =
  /\b(?:tracking\s*[+-]?\d+|medium\s+to\s+bold|bold\s+to\s+black|tagline:\s*\w+|x-height|cap\s+height\s+to\s+grid|across\s+weights|primary\s+wordmark:|monogram:\s*|align\s+cap\s+height)\b/i;

const COMPOSITION_LAYOUT_FRAGMENT =
  /\b(?:symmetry|asymmetry|asymmetric|lockup|vertical|horizontal|stacked|centered|negative\s+space|figure-ground|typographic\s+lockup|combination\s+mark|wordmark|lettermark|emblem|balanced|dynamic|modular|supporting\s+mark)\b/i;

export function sanitizeCompositionField(raw?: string | null): string {
  const cleaned = (raw ?? '').replace(/\s{2,}/g, ' ').trim();
  if (!cleaned) return 'symmetry';

  const parts = cleaned.split(/,\s*/).map((part) => part.trim()).filter(Boolean);
  const kept = parts.filter((part) => {
    if (TYPO_LAB_FRAGMENT.test(part)) return false;
    if (/\b(?:regular|bold|black|medium)\b/i.test(part) && !COMPOSITION_LAYOUT_FRAGMENT.test(part)) {
      return false;
    }
    return COMPOSITION_LAYOUT_FRAGMENT.test(part);
  });

  if (kept.length > 0) {
    return [...new Set(kept)].slice(0, 4).join(', ');
  }

  if (/symmetry/i.test(cleaned)) return 'symmetry';
  if (/asymmetry|asymmetric/i.test(cleaned)) return 'asymmetry';
  if (/lockup/i.test(cleaned)) return 'typographic lockup';
  if (/negative\s+space|figure-ground/i.test(cleaned)) return 'negative space figure-ground';

  return 'symmetry';
}

export type PaletteWithSelections =
  | 'two_color'
  | 'limited'
  | 'multi_color'
  | 'custom';

export function paletteNeedsColorSelections(
  palette?: string | null,
): palette is PaletteWithSelections {
  return palette === 'two_color' || palette === 'limited' || palette === 'multi_color' || palette === 'custom';
}

export function paletteColorSlotCount(palette: PaletteWithSelections): { min: number; max: number } {
  switch (palette) {
    case 'two_color':
      return { min: 2, max: 2 };
    case 'limited':
      return { min: 2, max: 3 };
    case 'multi_color':
      return { min: 2, max: 4 };
    default:
      return { min: 1, max: 4 };
  }
}

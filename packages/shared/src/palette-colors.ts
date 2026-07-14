import type { PaletteWithSelections } from './composition-sanitize';
import { paletteNeedsColorSelections } from './composition-sanitize';

export function defaultPaletteColors(palette: PaletteWithSelections): string[] {
  switch (palette) {
    case 'two_color':
      return ['#000000', '#E63946'];
    case 'limited':
      return ['#000000', '#F5C518'];
    case 'multi_color':
      return ['#000000', '#E63946', '#1D3557'];
    case 'custom':
      return ['#000000'];
    default:
      return ['#000000'];
  }
}

export function resolveColorSelections(
  palette?: string | null,
  selections?: string[] | null,
): string[] {
  const picked = (selections ?? []).map((c) => c.trim()).filter(Boolean);
  if (picked.length > 0) return picked;
  if (paletteNeedsColorSelections(palette)) {
    return defaultPaletteColors(palette);
  }
  return [];
}

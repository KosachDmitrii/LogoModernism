/** True when the company name has multiple words (e.g. "Multi Play"). */
export function isMultiWordCompanyName(name: string): boolean {
  return name.trim().split(/\s+/).filter(Boolean).length > 1;
}

/**
 * Text used in lettermark prompts:
 * - one word → full word ("Modo")
 * - multiple words → initials ("Multi Play" → "MP")
 */
export function lettermarkTextFromName(name: string): string {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    const cleaned = trimmed.replace(/[^A-Za-z0-9]/g, '');
    return cleaned || trimmed;
  }

  return words
    .slice(0, 3)
    .map((word) => word.replace(/[^A-Za-z]/g, '')[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

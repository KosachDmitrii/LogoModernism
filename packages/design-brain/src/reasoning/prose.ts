/** Ensure a fragment reads as a finished sentence. */
export function ensureSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (/[.!?…]$/.test(t)) return t;
  return `${t}.`;
}

/** Join prose fragments with proper sentence boundaries (no glued clauses). */
export function joinSentences(
  ...parts: Array<string | null | undefined>
): string {
  const sentences: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const sentence = ensureSentence(String(part).replace(/\s+/g, ' ').trim());
    if (!sentence) continue;
    const norm = sentence.toLowerCase();
    if (sentences.some((s) => s.toLowerCase() === norm)) continue;
    sentences.push(sentence);
  }
  return sentences.join(' ');
}

/**
 * Repair already-stored Brain prose where clauses were concatenated
 * without a period (e.g. "silhouette Lead with…").
 */
export function repairGluedProse(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';

  t = t.replace(
    /\b(silhouette|system|anchor|decoration|abstraction|lockup|wordmark|lettermark|glyph|balance|grid|sans-serif|geometry|icons?)\s+(Lead|Emphasize|Construction|Typography|Mark|Symbol|Industry|Grounded|Creative|Anchors|Primary|Direction|Avoid)\b/g,
    '$1. $2',
  );
  t = t.replace(
    /\b(decoration\.)\s*(Industry)\b/g,
    '$1 $2',
  );

  return ensureSentence(t);
}

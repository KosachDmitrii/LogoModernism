/**
 * Prompt compliance scanning — shared between constraint gate and prompt polish.
 *
 * Design:
 * - Image prompts are split into a positive body and an explicit Avoid: suffix.
 * - Compliance checks scan only the body; Avoid lists prohibitions by definition.
 * - Pipeline metadata (Client forbids, constraint resolutions, etc.) is stripped
 *   from the body before scanning and during prompt finalization.
 */

export const FLAT_VECTOR_POSITIVE_TERMS = [
  'photoreal',
  'photorealistic',
  '3d render',
  'mockup',
  'realistic photo',
] as const;

export const MONOCHROME_POSITIVE_TERMS = [
  'gradient',
  'multicolor',
  'rainbow',
  'accent color',
  'vibrant palette',
] as const;

const NEGATED_CLAUSE_PREFIX =
  /^(?:no|without|avoid|avoiding|never|not|remove|forbid|forbidden|forbids|disallow|disallowed|must not|do not|don't|doesn't|cannot|can't|hard constraint)\b/i;

const NEGATED_CLAUSE_INLINE =
  /\b(?:client forbids?|forbidden|hard constraint|\[constraint resolution\])\b/i;

/** Metadata echoed from brain/strategy that must not appear in image prompts or compliance scans. */
export const COMPLIANCE_METADATA_PATTERNS: RegExp[] = [
  /\bClient forbids:\s*[^.]+\./gi,
  /\bForbidden:\s*[^.]+\./gi,
  /\bHard constraint[^.]+\./gi,
  /\[\s*Constraint resolution\s*\][^.]*\.?/gi,
  /\bCreative direction:\s*[^.]+\./gi,
  /\bConstruction focus:\s*[^.]+\./gi,
  /\bTypography focus:\s*[^.]+\./gi,
  /\bColor approach:\s*[^.]+\./gi,
];

export function splitPromptForCompliance(text: string): { body: string; avoidSuffix: string } {
  const idx = text.search(/\bAvoid:\s*/i);
  if (idx === -1) {
    return { body: text.trim(), avoidSuffix: '' };
  }
  return {
    body: text.slice(0, idx).trim().replace(/\.\s*$/, ''),
    avoidSuffix: text.slice(idx).trim(),
  };
}

export function stripComplianceMetadata(body: string): string {
  let result = body;
  for (const pattern of COMPLIANCE_METADATA_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();
}

export function buildComplianceScanContext(promptText: string): {
  body: string;
  avoidSuffix: string;
} {
  const { body, avoidSuffix } = splitPromptForCompliance(promptText);
  return {
    body: stripComplianceMetadata(body),
    avoidSuffix,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNegatedClause(clause: string): boolean {
  const trimmed = clause.trim();
  if (!trimmed) return false;
  return NEGATED_CLAUSE_PREFIX.test(trimmed) || NEGATED_CLAUSE_INLINE.test(trimmed);
}

/**
 * True when `term` appears as a positive recommendation in prompt body
 * (not in Avoid suffix and not inside a negated clause).
 */
export function bodyRecommendsTerm(body: string, term: string): boolean {
  const normalized = stripComplianceMetadata(body);
  if (!normalized.trim()) return false;

  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\w*\\b`, 'i');
  const clauses = normalized.split(/[.;\n]+/);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed || !pattern.test(trimmed)) continue;
    if (isNegatedClause(trimmed)) continue;
    return true;
  }

  return false;
}

export function bodyRequiresTypography(body: string): boolean {
  const normalized = stripComplianceMetadata(body).toLowerCase();
  if (normalized.includes('no text') || normalized.includes('symbol-only') || normalized.includes('symbol only')) {
    return false;
  }
  return (
    bodyRecommendsTerm(normalized, 'wordmark') ||
    bodyRecommendsTerm(normalized, 'lettermark') ||
    bodyRecommendsTerm(normalized, 'typography')
  );
}

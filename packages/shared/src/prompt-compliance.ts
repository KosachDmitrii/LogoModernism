/**
 * Prompt compliance scanning — shared between constraint gate and prompt polish.
 *
 * Design:
 * - Image prompts are split into a positive body and an explicit Avoid: suffix.
 * - Compliance checks scan only the body; Avoid lists prohibitions by definition.
 * - Pipeline metadata (Client forbids, constraint resolutions, etc.) is stripped
 *   from the body before scanning and during prompt finalization.
 * - Inline negators ("no photorealism", "no shadows") must not count as violations.
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

const INLINE_NEGATOR_BEFORE_TERM =
  /\b(?:no|without|avoid|avoiding|never|not|remove|forbid|forbidden|forbids|disallow|disallowed|must not|do not|don't|doesn't|cannot|can't)\s*$/i;

const NEGATED_SPAN_PATTERN = /\b(?:no|without|avoid|avoiding|never|not)\s+[^.;]+/gi;

/** Metadata echoed from brain/strategy that must not appear in image prompts or compliance scans. */
export const COMPLIANCE_METADATA_PATTERNS: RegExp[] = [
  /\bClient forbids:\s*[^.]+\./gi,
  /\bForbidden:\s*[^.]+\./gi,
  /\bHard constraint[^.]+\./gi,
  /\[\s*Constraint resolution\s*\][^.]*\.?/gi,
  /\bCreative direction:\s*[^.]+\./gi,
  /\bConstruction focus:\s*[^.]+\./gi,
  /\bTypography focus:\s*[^.]+\./gi,
  /\bColor approach:\s*[^.]+(?:\.|$)/gi,
  /\bTone:\s*[^.]+(?:\.|$)/gi,
  /\bLead with Combination mark[^.]+(?:\.|$)/gi,
  /\bThe color palette will be[^.]+\./gi,
];

const PROMPT_BODY_RESUME_MARKERS =
  /\.\s+(?=(?:Custom wordmark|Industry direction|Unified vertical|Strong silhouette|Playful yet professional|Avoid generic|Tone:|Creative direction|Construction focus|Typography focus|Color approach:|Art direction:|Territory emphasis:|Rendering:|Mark type:|Lead with|Catalog reference|The color palette))/i;

/**
 * Split prompt into body and Avoid suffix. If Avoid appears mid-prompt, only the
 * comma-list belongs in Avoid — labeled sections after it return to the body.
 */
export function splitAvoidSection(text: string): { body: string; avoidSuffix: string } {
  const idx = text.search(/\bAvoid:\s*/i);
  if (idx === -1) {
    // Bare "Avoid photorealism, mockups..." without a colon (optimizer / LLM variants).
    // Do NOT match "Avoid generic …" — that is positive anti-template language in the body.
    const bareAvoidMatch = text.match(
      /\bAvoid\s+(?=photoreal|gradient|shadow|mockup|mascot|clipart|busy background|[a-z]+ism\b)/i,
    );
    if (bareAvoidMatch?.index != null && bareAvoidMatch.index > 0) {
      return {
        body: text.slice(0, bareAvoidMatch.index).trim().replace(/\.\s*$/, ''),
        avoidSuffix: text.slice(bareAvoidMatch.index).trim(),
      };
    }
    return { body: text.trim(), avoidSuffix: '' };
  }

  const before = text.slice(0, idx).trim();
  const fromAvoid = text.slice(idx).trim();
  const avoidContent = fromAvoid.replace(/^Avoid:\s*/i, '');

  let boundary = avoidContent.search(PROMPT_BODY_RESUME_MARKERS);
  let resumedFrom = boundary > 0 ? boundary + 1 : -1;

  // Peel durable body labels out of Avoid payloads (even without a preceding period).
  // Keep this list tight — Color:/Typography: are too common inside prompt body already
  // upstream of Avoid, and matching them here can shred catalog inspiration clauses.
  if (resumedFrom < 0) {
    const sectionIdx = avoidContent.search(
      /\b(?:Art direction:|Territory emphasis:|Industry direction:|Rendering:|Mark type:)/i,
    );
    if (sectionIdx > 0) {
      resumedFrom = sectionIdx;
    } else if (sectionIdx === 0) {
      return {
        body: [before, avoidContent].filter(Boolean).join('. ').replace(/\s{2,}/g, ' ').trim(),
        avoidSuffix: '',
      };
    }
  }

  if (resumedFrom > 0) {
    const avoidList = avoidContent.slice(0, resumedFrom).trim().replace(/[.\s]+$/, '');
    const resumedBody = avoidContent.slice(resumedFrom).trim();
    const body = [before, resumedBody].filter(Boolean).join('. ').replace(/\s{2,}/g, ' ').trim();
    return {
      body,
      avoidSuffix: avoidList ? `Avoid: ${avoidList}` : '',
    };
  }

  return { body: before, avoidSuffix: fromAvoid };
}

export function splitPromptForCompliance(text: string): { body: string; avoidSuffix: string } {
  const { body, avoidSuffix } = splitAvoidSection(text);
  return {
    body: body.replace(/\.\s*$/, ''),
    avoidSuffix,
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

function isTermNegatedInClause(clause: string, matchIndex: number): boolean {
  const before = clause.slice(0, matchIndex);
  const trimmedBefore = before.trim();

  if (!trimmedBefore) return false;

  if (NEGATED_CLAUSE_PREFIX.test(trimmedBefore) || NEGATED_CLAUSE_INLINE.test(trimmedBefore)) {
    return true;
  }

  if (INLINE_NEGATOR_BEFORE_TERM.test(trimmedBefore)) {
    return true;
  }

  for (const span of clause.matchAll(NEGATED_SPAN_PATTERN)) {
    const start = span.index ?? 0;
    const end = start + span[0].length;
    if (matchIndex >= start && matchIndex < end) {
      return true;
    }
  }

  return false;
}

/**
 * True when `term` appears as a positive recommendation in prompt body
 * (not in Avoid suffix and not inside a negated clause).
 */
export function bodyRecommendsTerm(body: string, term: string): boolean {
  const normalized = stripComplianceMetadata(body);
  if (!normalized.trim()) return false;

  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\w*\\b`, 'gi');
  const clauses = normalized.split(/[.;\n]+/);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    for (const match of trimmed.matchAll(pattern)) {
      const matchIndex = match.index ?? 0;
      if (!isTermNegatedInClause(trimmed, matchIndex)) {
        return true;
      }
    }
  }

  return false;
}

export function bodyRequiresTypography(body: string): boolean {
  const normalized = stripComplianceMetadata(body);
  const lower = normalized.toLowerCase();
  if (lower.includes('no text') || lower.includes('symbol-only') || lower.includes('symbol only')) {
    return false;
  }
  return (
    bodyRecommendsTerm(normalized, 'wordmark') ||
    bodyRecommendsTerm(normalized, 'lettermark') ||
    bodyRecommendsTerm(normalized, 'typography')
  );
}

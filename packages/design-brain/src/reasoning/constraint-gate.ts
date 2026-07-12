import type {
  BrainGenerateRequest,
  BrainArchitecture,
  ComposedPrompt,
  ConstraintReport,
  ConstraintViolation,
  DesignDecision,
} from '@logo-platform/shared';
import {
  hasExplicitBrandName,
  normalizeBrandName,
  stylePreferenceOverrides,
} from '@logo-platform/shared';
import { enrichViolation, type ViolationContext } from './constraint-resolutions';

function recommends(prompt: string, term: string): boolean {
  const lower = prompt.toLowerCase();
  const t = term.toLowerCase();
  let start = 0;

  while (true) {
    const idx = lower.indexOf(t, start);
    if (idx === -1) return false;

    const prefix = lower.slice(Math.max(0, idx - 160), idx);
    const lastSentenceBreak = Math.max(
      prefix.lastIndexOf('.'),
      prefix.lastIndexOf(';'),
      prefix.lastIndexOf('\n'),
    );
    const sentencePrefix = prefix.slice(lastSentenceBreak + 1);

    const isNegated =
      /\b(no|without|avoid|avoiding|never|not|remove|forbid|forbidden|disallow|disallowed)\b[^.]*$/i.test(
        sentencePrefix,
      ) ||
      /\bavoid\s*:[^.]*$/i.test(sentencePrefix) ||
      /\banti-?patterns?\s*:[^.]*$/i.test(sentencePrefix);

    if (!isNegated) return true;
    start = idx + t.length;
  }
}

function pushViolation(
  violations: ConstraintViolation[],
  ctx: ViolationContext,
  base: Omit<ConstraintViolation, 'id' | 'briefSide' | 'outputSide' | 'resolutions'>,
  details: Record<string, string> = {},
): void {
  violations.push(enrichViolation(base, ctx, details));
}

export function evaluateConstraintCompliance(
  decision: DesignDecision,
  prompt: ComposedPrompt,
  architecture: BrainArchitecture,
  request: BrainGenerateRequest,
): ConstraintReport {
  const violations: ConstraintViolation[] = [];
  const text = prompt.text;
  const lower = text.toLowerCase();
  const brand = normalizeBrandName(request.companyName);
  const style = stylePreferenceOverrides(request.briefContext);
  const colorPalette = request.briefContext?.colorPalette;
  const ctx: ViolationContext = { promptText: text, decision, request, architecture };

  if (brand && !lower.includes(brand.toLowerCase())) {
    pushViolation(violations, ctx, {
      code: 'brand_missing',
      severity: 'error',
      message: `Prompt must include brand name "${brand}"`,
      suggestion: `Spell the logo text exactly as "${brand}"`,
    });
  }

  if (!hasExplicitBrandName(brand)) {
    if (decision.markType === 'wordmark' || decision.markType === 'lettermark') {
      pushViolation(violations, ctx, {
        code: 'symbol_only_mark_type',
        severity: 'error',
        message: 'Symbol-only brief cannot use wordmark or lettermark',
      });
    }
    if (/\bwordmark\b|\blettermark\b|\btypography\b/.test(lower) && !lower.includes('no text')) {
      pushViolation(violations, ctx, {
        code: 'symbol_only_text',
        severity: 'error',
        message: 'Symbol-only brief must not require typography in the prompt',
      });
    }
  }

  if (colorPalette === 'black_white' || colorPalette === 'monochrome') {
    for (const term of ['gradient', 'multicolor', 'rainbow', 'accent color', 'vibrant palette']) {
      if (recommends(lower, term)) {
        pushViolation(
          violations,
          ctx,
          {
            code: 'palette_violation',
            severity: 'error',
            message: `Monochrome brief must not recommend ${term}`,
          },
          { term },
        );
      }
    }
  }

  if (!style.allowShadows && recommends(lower, 'shadow')) {
    pushViolation(violations, ctx, {
      code: 'shadows_forbidden',
      severity: 'error',
      message: 'Brief disallows shadows',
    });
  }

  if (!style.allowPhotoreal) {
    for (const term of ['photoreal', '3d render', 'mockup', 'realistic photo']) {
      if (recommends(lower, term)) {
        pushViolation(
          violations,
          ctx,
          {
            code: 'photoreal_forbidden',
            severity: 'error',
            message: `Brief requires flat vector — found "${term}"`,
          },
          { term },
        );
      }
    }
  }

  for (const forbidden of architecture.clientIntent.forbiddenMotifs) {
    const token = forbidden.toLowerCase().split(/\s+/)[0] ?? forbidden;
    if (token.length > 3 && recommends(lower, token)) {
      pushViolation(
        violations,
        ctx,
        {
          code: 'forbidden_motif',
          severity: 'error',
          message: `Client forbids motif: ${forbidden}`,
        },
        { motif: forbidden },
      );
    }
  }

  if (request.markType && decision.markType !== request.markType) {
    pushViolation(
      violations,
      ctx,
      {
        code: 'mark_type_mismatch',
        severity: 'warning',
        message: `Requested mark type ${request.markType}, decision used ${decision.markType}`,
      },
      { requested: request.markType },
    );
  }

  if (text.length < 80) {
    pushViolation(violations, ctx, {
      code: 'prompt_too_short',
      severity: 'warning',
      message: 'Enriched prompt is unusually short',
    });
  }

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const score = Math.max(0, 1 - errors * 0.25 - warnings * 0.08);

  return {
    passed: errors === 0,
    score,
    violations,
  };
}

export function constraintFeedback(report: ConstraintReport): string[] {
  return report.violations.map((v) =>
    v.suggestion ? `${v.message}. ${v.suggestion}` : v.message,
  );
}

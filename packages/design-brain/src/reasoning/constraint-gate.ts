import type {
  BrainGenerateRequest,
  BrainArchitecture,
  ComposedPrompt,
  ConstraintReport,
  ConstraintViolation,
  DesignDecision,
} from '@logo-platform/shared';
import {
  bodyRecommendsTerm,
  bodyRequiresTypography,
  buildComplianceScanContext,
  detectActivePromptConflicts,
  FLAT_VECTOR_POSITIVE_TERMS,
  hasExplicitBrandName,
  isStyleAntiPatternMotif,
  MONOCHROME_POSITIVE_TERMS,
  normalizeBrandName,
  resolvePromptSpec,
  stylePreferenceOverrides,
  analyzeClientVisualIntent,
  buildDesignStrategy,
} from '@logo-platform/shared';
import { enrichViolation, type ViolationContext } from './constraint-resolutions';

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
  const { body: complianceBody } = buildComplianceScanContext(text);
  const fullLower = text.toLowerCase();
  const brand = normalizeBrandName(request.companyName);
  const style = stylePreferenceOverrides(request.briefContext);
  const colorPalette = request.briefContext?.colorPalette;
  const ctx: ViolationContext = { promptText: text, decision, request, architecture };

  if (brand && !fullLower.includes(brand.toLowerCase())) {
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
    if (bodyRequiresTypography(complianceBody)) {
      pushViolation(violations, ctx, {
        code: 'symbol_only_text',
        severity: 'error',
        message: 'Symbol-only brief must not require typography in the prompt',
      });
    }
  }

  if (colorPalette === 'black_white' || colorPalette === 'monochrome') {
    for (const term of MONOCHROME_POSITIVE_TERMS) {
      if (bodyRecommendsTerm(complianceBody, term)) {
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

  if (!style.allowShadows && bodyRecommendsTerm(complianceBody, 'shadow')) {
    pushViolation(violations, ctx, {
      code: 'shadows_forbidden',
      severity: 'error',
      message: 'Brief disallows shadows',
    });
  }

  if (!style.allowPhotoreal) {
    for (const term of FLAT_VECTOR_POSITIVE_TERMS) {
      if (bodyRecommendsTerm(complianceBody, term)) {
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
    if (isStyleAntiPatternMotif(forbidden)) continue;
    const motif = forbidden.trim();
    if (motif.length <= 3) continue;
    if (bodyRecommendsTerm(complianceBody, motif.toLowerCase())) {
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

  const promptSpec = resolvePromptSpec({
    companyName: brand,
    markType: decision.markType ?? request.markType,
    typographyStyle: decision.typographyStyle ?? request.typographyStyle,
    colorPalette: request.briefContext?.colorPalette,
    clientNotes: request.briefContext?.clientNotes,
    constraints: request.briefContext?.constraints,
    composition: request.briefContext?.composition,
  });

  for (const conflict of detectActivePromptConflicts(text, promptSpec)) {
    pushViolation(
      violations,
      ctx,
      {
        code: conflict.code,
        severity: conflict.severity,
        message: conflict.message,
      },
      conflict.term ? { term: conflict.term } : {},
    );
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

function defaultDesignDecision(request: BrainGenerateRequest): DesignDecision {
  return {
    markType: request.markType ?? 'combination',
    typographyStyle: request.typographyStyle,
    geometry: [],
    construction: [],
    composition: [],
    typography: [],
    era: request.preferredEra ?? 'swiss',
    principles: [],
    antiPatterns: [],
    catalogReferences: request.catalogReferenceIds ?? [],
    reasoning: 'Rules pipeline compliance check',
    promptText: '',
    confidence: 0.7,
  };
}

export function buildComplianceArchitecture(
  request: BrainGenerateRequest,
): BrainArchitecture {
  const clientIntent = analyzeClientVisualIntent({
    industry: request.industry,
    companyName: request.companyName,
    briefContext: request.briefContext,
  });
  const designStrategy = buildDesignStrategy(clientIntent, {
    markType: request.markType,
    colorPalette: request.briefContext?.colorPalette,
    minimalismLevel: request.minimalismLevel,
  });

  return {
    clientIntent,
    designStrategy,
    agentContributions: [],
    interviewQuestions: [],
    visualReferences: [],
  };
}

export function evaluateRequestPromptCompliance(
  prompt: ComposedPrompt,
  request: BrainGenerateRequest,
  decision?: DesignDecision,
  architecture?: BrainArchitecture,
): ConstraintReport {
  const arch = architecture ?? buildComplianceArchitecture(request);
  const resolvedDecision = decision ?? defaultDesignDecision(request);
  return evaluateConstraintCompliance(resolvedDecision, prompt, arch, request);
}

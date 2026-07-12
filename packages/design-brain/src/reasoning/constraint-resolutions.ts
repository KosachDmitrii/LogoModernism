import type {
  BrainArchitecture,
  BrainGenerateRequest,
  ConstraintConflictSide,
  ConstraintResolution,
  ConstraintViolation,
  DesignDecision,
} from '@logo-platform/shared';
import { stylePreferenceOverrides } from '@logo-platform/shared';

export interface ViolationContext {
  promptText: string;
  decision: DesignDecision;
  request: BrainGenerateRequest;
  architecture: BrainArchitecture;
}

function excerptAround(text: string, term: string, radius = 48): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) {
    const trimmed = text.trim();
    return trimmed.length <= 96 ? trimmed : `${trimmed.slice(0, 93)}…`;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + term.length + radius);
  const slice = text.slice(start, end).trim();
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${slice}${suffix}`;
}

function briefSide(fieldKey: string, value: string): ConstraintConflictSide {
  return { role: 'brief', fieldKey, value };
}

function outputSide(fieldKey: string, value: string, excerpt?: string): ConstraintConflictSide {
  return { role: 'output', fieldKey, value, excerpt: excerpt ?? value };
}

function paletteLabel(palette: string | undefined): string {
  switch (palette) {
    case 'black_white':
      return 'Black & white only';
    case 'monochrome':
      return 'Monochrome';
    case 'two_color':
      return 'Two-color palette';
    case 'multi_color':
      return 'Multi-color palette';
    case 'limited':
      return 'Limited palette';
    default:
      return palette ?? 'Not specified';
  }
}

function keepBriefRecompose(directive: string): ConstraintResolution {
  return {
    id: 'keep_brief_recompose',
    compose: { appendConstraints: directive },
  };
}

export function buildViolationResolutions(
  code: string,
  ctx: ViolationContext,
  details: Record<string, string> = {},
): Pick<ConstraintViolation, 'briefSide' | 'outputSide' | 'resolutions'> {
  const { promptText, decision, request, architecture } = ctx;
  const style = stylePreferenceOverrides(request.briefContext);
  const colorPalette = request.briefContext?.colorPalette;
  const brand = request.companyName?.trim() ?? '';

  switch (code) {
    case 'brand_missing': {
      return {
        briefSide: briefSide('companyName', brand),
        outputSide: outputSide('promptText', 'Brand name missing from prompt', excerptAround(promptText, 'logo', 60)),
        resolutions: [
          keepBriefRecompose(`Must spell logo text exactly as "${brand}".`),
          {
            id: 'edit_brand_in_brief',
            briefPatch: {
              appendClientNotes: `[Constraint resolution] Confirm brand name for logo text: ${brand}.`,
            },
            compose: { appendConstraints: `Logo text must read "${brand}".` },
          },
        ],
      };
    }

    case 'palette_violation': {
      const term = details.term ?? 'color';
      return {
        briefSide: briefSide('colorPalette', paletteLabel(colorPalette)),
        outputSide: outputSide('promptText', `Mentions "${term}"`, excerptAround(promptText, term)),
        resolutions: [
          keepBriefRecompose(
            `Strict monochrome — remove all references to ${term}, gradients, accent colors, and multicolor.`,
          ),
          {
            id: 'allow_two_color',
            briefPatch: { colorPalette: 'two_color', appendConstraints: 'Accent color allowed within a two-color system.' },
            compose: { appendConstraints: 'Use a restrained two-color palette with one accent.' },
          },
          {
            id: 'allow_multi_color',
            briefPatch: { colorPalette: 'multi_color' },
            compose: { appendConstraints: 'Color palette may include multiple colors as appropriate.' },
          },
        ],
      };
    }

    case 'forbidden_motif': {
      const motif = details.motif ?? 'forbidden motif';
      return {
        briefSide: briefSide('forbiddenMotifs', motif),
        outputSide: outputSide('promptText', `Uses "${motif}"`, excerptAround(promptText, motif.split(/\s+/)[0] ?? motif)),
        resolutions: [
          keepBriefRecompose(`Hard constraint — never use ${motif}. Remove entirely from the prompt.`),
          {
            id: 'allow_motif',
            briefPatch: {
              appendClientNotes: `[Constraint resolution] Explicitly allowed despite earlier notes: ${motif}.`,
              appendConstraints: `Client override: ${motif} is allowed for this project.`,
            },
            compose: { appendConstraints: `${motif} is explicitly allowed.` },
          },
          {
            id: 'territory_typography',
            compose: {
              preferredTerritoryId: 'territory-typography',
              appendConstraints: `Avoid ${motif} entirely — typography-led direction without emblem or badge structure.`,
            },
          },
        ],
      };
    }

    case 'shadows_forbidden':
      return {
        briefSide: briefSide('allowShadows', 'Shadows disabled'),
        outputSide: outputSide('promptText', 'Mentions shadow', excerptAround(promptText, 'shadow')),
        resolutions: [
          keepBriefRecompose('Flat vector only — no shadows, drop shadows, or depth effects.'),
          {
            id: 'allow_shadows',
            briefPatch: { allowShadows: true, appendConstraints: 'Subtle shadows allowed if needed.' },
            compose: { appendConstraints: 'Shadows may be used sparingly.' },
          },
        ],
      };

    case 'photoreal_forbidden': {
      const term = details.term ?? 'photoreal';
      return {
        briefSide: briefSide('allowPhotoreal', 'Flat vector required'),
        outputSide: outputSide('promptText', `Mentions "${term}"`, excerptAround(promptText, term)),
        resolutions: [
          keepBriefRecompose('Flat vector logo only — no photoreal, 3D render, or mockup language.'),
          {
            id: 'allow_photoreal',
            briefPatch: { allowPhotoreal: true },
            compose: { appendConstraints: 'Photoreal or 3D rendering language is allowed.' },
          },
        ],
      };
    }

    case 'symbol_only_mark_type':
      return {
        briefSide: briefSide('markType', 'Symbol-only (no brand name)'),
        outputSide: outputSide('markType', decision.markType),
        resolutions: [
          keepBriefRecompose('Symbol-only brief — no wordmark or lettermark. Pure abstract mark, no typography.'),
          {
            id: 'allow_wordmark',
            briefPatch: {
              markType: 'wordmark',
              appendClientNotes: '[Constraint resolution] Typography allowed — switched to wordmark.',
            },
            compose: { appendConstraints: 'Wordmark with custom letterforms is allowed.' },
          },
        ],
      };

    case 'symbol_only_text':
      return {
        briefSide: briefSide('markType', 'Symbol-only (no typography)'),
        outputSide: outputSide('promptText', 'Requires typography in prompt', excerptAround(promptText, 'wordmark')),
        resolutions: [
          keepBriefRecompose('Symbol-only — remove wordmark, lettermark, and typography requirements.'),
          {
            id: 'allow_typography',
            briefPatch: {
              markType: 'combination',
              appendClientNotes: '[Constraint resolution] Typography allowed — combination mark.',
            },
            compose: { appendConstraints: 'Combination mark with supporting typography is allowed.' },
          },
        ],
      };

    case 'mark_type_mismatch': {
      const requested = request.markType ?? details.requested ?? 'brief mark type';
      return {
        briefSide: briefSide('markType', String(requested)),
        outputSide: outputSide('markType', decision.markType),
        resolutions: [
          {
            id: 'use_brief_mark_type',
            briefPatch: { markType: (request.markType ?? '') as '' | 'wordmark' | 'lettermark' | 'combination' },
            compose: { appendConstraints: `Use mark type ${requested} as specified in the brief.` },
          },
          {
            id: 'use_brain_mark_type',
            briefPatch: { markType: decision.markType },
            compose: { appendConstraints: `Use ${decision.markType} — brain-selected mark architecture.` },
          },
        ],
      };
    }

    case 'prompt_too_short':
      return {
        briefSide: briefSide('constraints', 'Detailed prompt expected'),
        outputSide: outputSide('promptText', `${promptText.trim().length} characters`, promptText.slice(0, 96)),
        resolutions: [keepBriefRecompose('Expand the prompt with construction, typography, and constraint details.')],
      };

    default:
      return {
        resolutions: [keepBriefRecompose('Recompose prompts to satisfy all brief constraints.')],
      };
  }
}

export function enrichViolation(
  base: Omit<ConstraintViolation, 'id' | 'briefSide' | 'outputSide' | 'resolutions'>,
  ctx: ViolationContext,
  details: Record<string, string> = {},
): ConstraintViolation {
  const suffix = Object.values(details).join('-') || base.message.slice(0, 24);
  const id = `${base.code}:${suffix}`.replace(/\s+/g, '_').toLowerCase();
  const conflict = buildViolationResolutions(base.code, ctx, details);

  return {
    ...base,
    id,
    ...conflict,
  };
}

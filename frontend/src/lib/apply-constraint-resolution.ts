import type { ConstraintResolution, DesignBrief } from '../types';
import type { ComposePromptsOptions } from '../hooks/useComposePrompts';

function joinConstraints(existing: string, additions: string[]): string {
  const parts = [existing, ...additions].map((part) => part.trim()).filter(Boolean);
  return parts.join('. ');
}

export function applyConstraintResolution(
  brief: DesignBrief,
  resolution: ConstraintResolution,
): { brief: DesignBrief; composeOptions?: ComposePromptsOptions } {
  const patch = resolution.briefPatch;
  const compose = resolution.compose;

  const constraintAdditions = [patch?.appendConstraints, compose?.appendConstraints].filter(
    Boolean,
  ) as string[];

  const next: DesignBrief = {
    ...brief,
    ...(patch?.colorPalette !== undefined ? { colorPalette: patch.colorPalette } : {}),
    ...(patch?.allowShadows !== undefined ? { allowShadows: patch.allowShadows } : {}),
    ...(patch?.allowPhotoreal !== undefined ? { allowPhotoreal: patch.allowPhotoreal } : {}),
    ...(patch?.markType !== undefined ? { markType: patch.markType } : {}),
    ...(constraintAdditions.length
      ? { constraints: joinConstraints(brief.constraints, constraintAdditions) }
      : {}),
    ...(patch?.appendClientNotes
      ? {
          clientNotes: [brief.clientNotes, patch.appendClientNotes].filter(Boolean).join('\n\n'),
        }
      : {}),
  };

  if (next.sources.length === 0 && Object.keys(patch ?? {}).length > 0) {
    next.sources = ['Client brief'];
  }

  const composeOptions: ComposePromptsOptions | undefined = compose?.preferredTerritoryId
    ? { preferredTerritoryId: compose.preferredTerritoryId }
    : undefined;

  return { brief: next, composeOptions };
}

export function applyConstraintResolutions(
  brief: DesignBrief,
  resolutions: ConstraintResolution[],
): { brief: DesignBrief; composeOptions?: ComposePromptsOptions } {
  let current = brief;
  let composeOptions: ComposePromptsOptions | undefined;

  for (const resolution of resolutions) {
    const result = applyConstraintResolution(current, resolution);
    current = result.brief;
    if (result.composeOptions) {
      composeOptions = { ...composeOptions, ...result.composeOptions };
    }
  }

  return { brief: current, composeOptions };
}

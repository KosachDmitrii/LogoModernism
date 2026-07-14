import type { PromptSchema } from './types';
import { filterAvoidForRenderEffects, negativeBaseForRenderEffects, type RenderEffectFlags } from './render-effects';

export function renderPositive(schema: PromptSchema): string {
  return schema.sections.map((s) => `${s.text}.`).join(' ');
}

export function renderNegative(schema: PromptSchema, effects?: RenderEffectFlags): string {
  const flags = effects ?? { allowShadows: false, allowPhotoreal: false };
  const avoid = schema.sections.find((s) => s.key === 'avoid')?.text ?? '';
  const base = negativeBaseForRenderEffects(flags);

  const avoidTail = filterAvoidForRenderEffects(
    avoid.replace(/^Avoid:\s*/i, '').split(',').map((s) => s.trim()).filter(Boolean),
    flags,
  );
  return [...new Set([...base, ...avoidTail])].join(', ');
}

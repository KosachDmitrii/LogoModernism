import type { PromptSchema } from './types';

export function renderPositive(schema: PromptSchema): string {
  return schema.sections.map((s) => `${s.text}.`).join(' ');
}

export function renderNegative(schema: PromptSchema): string {
  const avoid = schema.sections.find((s) => s.key === 'avoid')?.text ?? '';
  const base = [
    'gradients',
    'neon glow',
    'photorealistic',
    '3d render',
    'mockup',
    'watermark',
    'text artifacts',
    'stock clipart',
    'literal food illustrations',
    'trademark likeness',
    'busy texture',
    'halftone',
  ];

  const avoidTail = avoid.replace(/^Avoid:\s*/i, '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...base, ...avoidTail])].join(', ');
}

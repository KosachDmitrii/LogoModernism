export interface RenderEffectFlags {
  allowShadows: boolean;
  allowPhotoreal: boolean;
}

export function renderingLine(flags: RenderEffectFlags): string {
  const parts = ['flat vector illustration', 'scalable silhouette readable at small sizes'];

  if (flags.allowShadows && flags.allowPhotoreal) {
    parts.push('include subtle controlled shadows and controlled 3D dimensional depth');
  } else if (flags.allowShadows) {
    parts.push('include subtle controlled shadows');
  } else if (flags.allowPhotoreal) {
    parts.push('include controlled 3D dimensional depth');
  } else {
    parts.push('no shadows no depth effects', 'no gradients');
  }

  if ((flags.allowShadows || flags.allowPhotoreal) && !flags.allowPhotoreal) {
    parts.push('no gradients');
  }

  return parts.join(', ');
}

export function filterAvoidForRenderEffects(items: string[], flags: RenderEffectFlags): string[] {
  return items.filter((item) => {
    const lower = item.toLowerCase();
    if (flags.allowShadows && /shadow|depth effect/i.test(lower)) return false;
    if (flags.allowPhotoreal && (/3d|photoreal|dimensional/i.test(lower) || lower === 'gradients')) {
      return false;
    }
    return true;
  });
}

export function negativeBaseForRenderEffects(flags: RenderEffectFlags): string[] {
  const base = [
    'neon glow',
    'mockup',
    'watermark',
    'text artifacts',
    'stock clipart',
    'literal food illustrations',
    'trademark likeness',
    'busy texture',
    'halftone',
  ];

  if (!flags.allowPhotoreal) {
    base.unshift('photorealistic', '3d render');
  }
  if (!flags.allowPhotoreal && !flags.allowShadows) {
    base.unshift('gradients');
  }

  return base;
}

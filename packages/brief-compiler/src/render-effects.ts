export interface RenderEffectFlags {
  allowShadows: boolean;
  allowPhotoreal: boolean;
}

export function renderingLine(flags: RenderEffectFlags): string {
  const parts = ['flat vector illustration', 'scalable silhouette readable at small sizes'];

  if (flags.allowShadows && flags.allowPhotoreal) {
    parts.push('include subtle controlled shadows and controlled 3D dimensional depth');
  } else if (flags.allowShadows) {
    parts.push('include subtle controlled shadows', 'no 3D dimensional depth', 'no photorealism');
  } else if (flags.allowPhotoreal) {
    parts.push('include controlled 3D dimensional depth', 'no shadows');
  } else {
    parts.push('no shadows', 'no 3D dimensional depth', 'no photorealism', 'no gradients');
  }

  if ((flags.allowShadows || flags.allowPhotoreal) && !flags.allowPhotoreal) {
    parts.push('no gradients');
  }

  return parts.join(', ');
}

export function filterAvoidForRenderEffects(items: string[], flags: RenderEffectFlags): string[] {
  return items.flatMap((item) => {
    const lower = item.toLowerCase();
    const mentionsShadow = /shadow/i.test(lower);
    const mentionsDepth = /depth|3d|photoreal|dimensional/i.test(lower);

    if (mentionsShadow && mentionsDepth) {
      if (flags.allowShadows && flags.allowPhotoreal) return [];
      if (flags.allowShadows) return ['3d effects'];
      if (flags.allowPhotoreal) return ['shadows'];
      return [item];
    }
    if (flags.allowShadows && mentionsShadow) return [];
    if (flags.allowPhotoreal && (/3d|photoreal|dimensional/i.test(lower) || lower === 'gradients')) {
      return [];
    }
    return [item];
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
  if (!flags.allowShadows) {
    base.unshift('shadows');
  }
  if (!flags.allowPhotoreal && !flags.allowShadows) {
    base.unshift('gradients');
  }

  return base;
}

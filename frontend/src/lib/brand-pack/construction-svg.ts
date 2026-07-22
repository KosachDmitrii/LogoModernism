import type { ComposedPrompt, CreativeTerritory, DesignBrief } from '../../types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(companyName: string): string {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LM';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

type MarkAxis = 'balanced' | 'construction_led' | 'typography_led';

function resolveAxis(prompt: ComposedPrompt, rank: number): MarkAxis {
  const id = prompt.metadata?.creativeTerritory?.id;
  if (id === 'territory-construction') return 'construction_led';
  if (id === 'territory-typography') return 'typography_led';
  if (id === 'territory-primary') return 'balanced';
  return (['balanced', 'construction_led', 'typography_led'] as const)[(rank - 1) % 3]!;
}

function haystackOf(prompt: ComposedPrompt, brief: DesignBrief): string {
  return [
    prompt.text,
    ...brief.selectedShapes,
    brief.preferredShapes,
    brief.geometry,
    brief.construction,
    ...(prompt.dna?.geometry ?? []),
    ...(prompt.dna?.construction ?? []),
    prompt.metadata?.creativeTerritory?.constructionFocus ?? '',
    prompt.metadata?.creativeTerritory?.thesis ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

/** Map brief/DNA/prompt language onto construction motif families. */
export function resolvePrimitiveIds(prompt: ComposedPrompt, brief: DesignBrief): string[] {
  const haystack = haystackOf(prompt, brief);
  const ids: string[] = [];
  const push = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  if (/hex|honey/.test(haystack)) push('prim-hexagon');
  if (/triangl|delta|chevron/.test(haystack)) push('prim-triangle');
  if (/cross|plus|intersect/.test(haystack)) push('prim-cross');
  if (/concentric|ring|target/.test(haystack)) push('prim-concentric');
  if (/arc|curve|stream|sweep/.test(haystack)) push('prim-arc');
  if (/pixel|chip|grid|square|rect|modular|cluster/.test(haystack)) push('prim-square');
  if (/circle|round|oval|radial/.test(haystack)) push('prim-circle');

  if (ids.length === 0) {
    const mark = brief.markType || prompt.metadata?.markType || 'combination';
    if (mark === 'wordmark' || mark === 'lettermark') push('prim-square');
    else {
      push('prim-circle');
      push('prim-square');
    }
  }

  if (/pixel|chip|data stream/.test(haystack)) {
    push('prim-square');
    push('prim-arc');
  }

  return ids.slice(0, 3);
}

function complexityFromBrief(brief: DesignBrief, prompt?: ComposedPrompt): 'minimal' | 'medium' | 'high' {
  const c = (brief.complexity || prompt?.dna?.complexity || '').toLowerCase();
  if (c.includes('minimal') || c.includes('simple') || /ultra minimal|minimal complexity/i.test(c)) {
    return 'minimal';
  }
  if (c.includes('complex') || c.includes('rich') || c.includes('high')) return 'high';
  return 'medium';
}

function constructionGrid(axis: MarkAxis): string {
  if (axis !== 'construction_led') {
    return `<g opacity="0.12" stroke="#a1a1aa" stroke-width="0.6">
      ${Array.from({ length: 7 }, (_, i) => {
        const v = 40 + i * 28;
        return `<line x1="${v}" y1="48" x2="${v}" y2="200"/><line x1="40" y1="${48 + i * 22}" x2="236" y2="${48 + i * 22}"/>`;
      }).join('')}
    </g>`;
  }
  return `<g opacity="0.28" stroke="#71717a" stroke-width="0.7">
    ${Array.from({ length: 9 }, (_, i) => {
      const v = 36 + i * 22;
      return `<line x1="${v}" y1="44" x2="${v}" y2="210"/><line x1="36" y1="${44 + i * 18}" x2="234" y2="${44 + i * 18}"/>`;
    }).join('')}
    <line x1="124" y1="44" x2="124" y2="210" stroke="#b91c1c" stroke-dasharray="3 2" opacity="0.7"/>
    <line x1="36" y1="126" x2="234" y2="126" stroke="#b91c1c" stroke-dasharray="3 2" opacity="0.7"/>
  </g>`;
}

/** Pixel → stream → terminal mark (fintech / modular DNA). */
function streamMark(variant: MarkAxis, ox: number, oy: number, scale: number): string {
  const s = (n: number) => n * scale;
  if (variant === 'construction_led') {
    // Scatter → waves → chip grid
    const pixels = [
      [0, 1], [1, 0], [1, 2], [2, 1], [0, 3], [2, 3], [3, 0], [3, 2],
    ]
      .map(([x, y]) => {
        const size = 7 + ((x + y) % 2);
        return `<rect x="${ox + s(x * 10)}" y="${oy + s(y * 10)}" width="${s(size)}" height="${s(size)}" fill="#111"/>`;
      })
      .join('');
    const waves = [0, 1, 2, 3]
      .map(
        (i) =>
          `<path d="M${ox + s(42)} ${oy + s(12 + i * 12)} C${ox + s(70)} ${oy + s(8 + i * 12)}, ${ox + s(90)} ${oy + s(18 + i * 12)}, ${ox + s(112)} ${oy + s(14 + i * 12)}" fill="none" stroke="#111" stroke-width="${Math.max(1.5, s(2.2))}"/>`,
      )
      .join('');
    const chip = [0, 1, 2]
      .flatMap((col) =>
        [0, 1, 2].map(
          (row) =>
            `<rect x="${ox + s(118 + col * 11)}" y="${oy + s(8 + row * 14)}" width="${s(9)}" height="${s(11)}" rx="${s(1.5)}" fill="#111"/>`,
        ),
      )
      .join('');
    return `${pixels}${waves}${chip}`;
  }

  if (variant === 'typography_led') {
    // Compact cluster → liquid curves → solid block (smaller symbol)
    const pixels = [
      [0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2],
    ]
      .map(
        ([x, y]) =>
          `<rect x="${ox + s(x * 9)}" y="${oy + s(y * 9)}" width="${s(7)}" height="${s(7)}" fill="#111"/>`,
      )
      .join('');
    const curves = [0, 1, 2]
      .map(
        (i) =>
          `<path d="M${ox + s(36)} ${oy + s(8 + i * 10)} Q${ox + s(62)} ${oy + s(2 + i * 12)}, ${ox + s(88)} ${oy + s(10 + i * 10)}" fill="none" stroke="#111" stroke-width="${Math.max(1.4, s(2))}"/>`,
      )
      .join('');
    return `${pixels}${curves}<rect x="${ox + s(92)}" y="${oy + s(4)}" width="${s(22)}" height="${s(36)}" rx="${s(4)}" fill="#111"/>`;
  }

  // Balanced: dense pixel cluster → three streams → square terminals
  const pixels = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
    [0, 3], [2, 3], [3, 2],
  ]
    .map(
      ([x, y]) =>
        `<rect x="${ox + s(x * 9)}" y="${oy + s(y * 9)}" width="${s(7.5)}" height="${s(7.5)}" fill="#111"/>`,
    )
    .join('');
  const streams = [
    `M${ox + s(40)} ${oy + s(6)} C${ox + s(70)} ${oy + s(-2)}, ${ox + s(95)} ${oy + s(10)}, ${ox + s(118)} ${oy + s(2)}`,
    `M${ox + s(40)} ${oy + s(18)} C${ox + s(72)} ${oy + s(14)}, ${ox + s(96)} ${oy + s(22)}, ${ox + s(118)} ${oy + s(18)}`,
    `M${ox + s(40)} ${oy + s(30)} C${ox + s(74)} ${oy + s(34)}, ${ox + s(98)} ${oy + s(28)}, ${ox + s(118)} ${oy + s(34)}`,
  ]
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#111" stroke-width="${Math.max(1.6, s(2.4))}" stroke-linecap="round"/>`,
    )
    .join('');
  const terminals = [2, 18, 34]
    .map(
      (y) =>
        `<rect x="${ox + s(120)}" y="${oy + s(y)}" width="${s(8)}" height="${s(8)}" fill="#111"/>`,
    )
    .join('');
  return `${pixels}${streams}${terminals}`;
}

function geometricMark(primitiveIds: string[], ox: number, oy: number, scale: number): string {
  const s = (n: number) => n * scale;
  if (primitiveIds.includes('prim-triangle')) {
    return `<polygon points="${ox + s(40)},${oy} ${ox + s(80)},${oy + s(70)} ${ox},${oy + s(70)}" fill="none" stroke="#111" stroke-width="${s(2.5)}"/>`;
  }
  if (primitiveIds.includes('prim-hexagon')) {
    return `<polygon points="${ox + s(40)},${oy} ${ox + s(70)},${oy + s(18)} ${ox + s(70)},${oy + s(52)} ${ox + s(40)},${oy + s(70)} ${ox + s(10)},${oy + s(52)} ${ox + s(10)},${oy + s(18)}" fill="none" stroke="#111" stroke-width="${s(2.5)}"/>`;
  }
  if (primitiveIds.includes('prim-concentric') || primitiveIds.includes('prim-circle')) {
    return `<circle cx="${ox + s(40)}" cy="${oy + s(40)}" r="${s(36)}" fill="none" stroke="#111" stroke-width="${s(2.5)}"/><circle cx="${ox + s(40)}" cy="${oy + s(40)}" r="${s(20)}" fill="none" stroke="#111" stroke-width="${s(2)}"/>`;
  }
  if (primitiveIds.includes('prim-cross')) {
    return `<rect x="${ox + s(32)}" y="${oy}" width="${s(16)}" height="${s(80)}" fill="#111"/><rect x="${ox}" y="${oy + s(32)}" width="${s(80)}" height="${s(16)}" fill="#111"/>`;
  }
  // Default modular squares
  return [0, 1, 2]
    .flatMap((col) =>
      [0, 1, 2].map((row) =>
        (col + row) % 2 === 0
          ? `<rect x="${ox + s(col * 22)}" y="${oy + s(row * 22)}" width="${s(18)}" height="${s(18)}" fill="#111"/>`
          : '',
      ),
    )
    .join('');
}

function dnaSymbol(
  prompt: ComposedPrompt,
  brief: DesignBrief,
  axis: MarkAxis,
  ox: number,
  oy: number,
  scale: number,
): string {
  const haystack = haystackOf(prompt, brief);
  const primitives = resolvePrimitiveIds(prompt, brief);
  if (/pixel|chip|stream|data|fintech|modular geometric|cluster/.test(haystack)) {
    return streamMark(axis, ox, oy, scale);
  }
  return geometricMark(primitives, ox, oy, scale);
}

function wordmarkSketch(
  brand: string,
  axis: MarkAxis,
  x: number,
  y: number,
): string {
  const display = brand.slice(0, 14);
  const size = axis === 'typography_led' ? 34 : axis === 'construction_led' ? 26 : 30;
  const weight = axis === 'typography_led' ? 700 : 600;
  // Annotate a modified glyph counter (square in A / V space) — DNA cue, not a font file.
  const glyphNote =
    axis === 'typography_led'
      ? `<rect x="${x + Math.min(120, display.length * 14)}" y="${y - 22}" width="8" height="8" fill="#111"/>
         <text x="${x}" y="${y + 28}" font-family="IBM Plex Mono, monospace" font-size="9" fill="#71717a">Modified glyph counter · neo-grotesque</text>`
      : axis === 'balanced'
        ? `<rect x="${x + Math.min(100, display.length * 12)}" y="${y - 18}" width="6" height="6" fill="#111"/>`
        : '';
  return `
    <text x="${x}" y="${y}" font-family="DM Sans, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${axis === 'typography_led' ? 6 : 4}" fill="#111">${escapeXml(display)}</text>
    <line x1="${x}" y1="${y + 8}" x2="${x + Math.min(300, display.length * (size * 0.72))}" y2="${y + 8}" stroke="#111" stroke-width="1"/>
    ${glyphNote}
  `;
}

function axisCaption(axis: MarkAxis, territory: CreativeTerritory | null): string {
  if (territory?.name) return territory.name;
  if (axis === 'construction_led') return 'Construction-led';
  if (axis === 'typography_led') return 'Typography-led';
  return 'Primary direction';
}

/** Construction sheet: DNA-aware mark sketch + axis-specific hierarchy. */
export function buildConstructionSvg(
  prompt: ComposedPrompt,
  companyName: string,
  brief: DesignBrief,
  rank: number,
): string {
  const axis = resolveAxis(prompt, rank);
  const brand = (companyName || prompt.companyName || 'BRAND').trim().toUpperCase() || 'BRAND';
  const letters = initials(companyName || prompt.companyName || 'Logo');
  const markType = brief.markType || prompt.metadata?.markType || 'combination';
  const territory = prompt.metadata?.creativeTerritory ?? null;
  const complexity = complexityFromBrief(brief, prompt);
  const primitives = resolvePrimitiveIds(prompt, brief);

  const title = `Direction ${rank} · ${markType} · ${letters}`;
  const subtitle = [
    axisCaption(axis, territory),
    complexity,
    territory?.constructionFocus || brief.construction || 'modular',
    primitives.join('+') || 'dna',
  ]
    .filter(Boolean)
    .join(' · ');

  const symbolScale = axis === 'typography_led' ? 0.85 : axis === 'construction_led' ? 1.05 : 1;
  const symbolY = axis === 'typography_led' ? 72 : 64;
  const wordY = axis === 'typography_led' ? 200 : 228;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <rect width="480" height="360" fill="#fafafa"/>
  <text x="40" y="28" font-family="IBM Plex Mono, monospace" font-size="11" fill="#52525b">${escapeXml(title)}</text>
  ${constructionGrid(axis)}
  <g opacity="0.95">
    ${dnaSymbol(prompt, brief, axis, 56, symbolY, symbolScale)}
  </g>
  ${wordmarkSketch(brand, axis, 40, wordY)}
  <text x="40" y="300" font-family="IBM Plex Mono, monospace" font-size="11" fill="#52525b">${escapeXml(subtitle)}</text>
  <text x="40" y="322" font-family="IBM Plex Mono, monospace" font-size="9" fill="#a1a1aa">DNA construction sketch — geometry of the brief, not a PNG trace</text>
  <text x="40" y="340" font-family="IBM Plex Mono, monospace" font-size="9" fill="#a1a1aa">Use images/ as master; refine this scaffold into final vector after selection</text>
</svg>
`;
}

export function buildUsageSheetSvg(
  prompt: ComposedPrompt,
  companyName: string,
  brief: DesignBrief,
  rank: number,
): string {
  const axis = resolveAxis(prompt, rank);
  const brand = escapeXml(companyName || prompt.companyName || 'Brand');
  const mark = dnaSymbol(prompt, brief, axis, 0, 0, 0.95);
  const markSmall = dnaSymbol(prompt, brief, axis, 0, 0, 0.7);

  const panel = (x: number, bg: string, ink: string, label: string, content: string) => `
    <rect x="${x}" y="28" width="200" height="168" fill="${bg}" stroke="#d4d4d8"/>
    <g transform="translate(${x + 36}, 56)" fill="${ink}" stroke="${ink}">${content}</g>
    <text x="${x + 12}" y="214" font-family="IBM Plex Mono, monospace" font-size="10" fill="#52525b">${label}</text>
  `;

  // Reverse: white mark on dark — recolor by nesting in white-filled group isn't trivial;
  // draw streams with currentColor via replacing #111.
  const primaryMark = mark.replace(/#111/g, '#111111');
  const monoMark = markSmall.replace(/#111/g, '#18181b');
  const reverseMark = mark.replace(/#111/g, '#fafafa');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" width="720" height="280">
  <rect width="720" height="280" fill="#f4f4f5"/>
  ${panel(24, '#fafafa', '#111', 'Primary · DNA mark', primaryMark)}
  ${panel(252, '#ffffff', '#18181b', 'Mono · clear space', monoMark)}
  <rect x="480" y="28" width="200" height="168" fill="#18181b" stroke="#d4d4d8"/>
  <g transform="translate(516, 56)">${reverseMark}</g>
  <text x="492" y="214" font-family="IBM Plex Mono, monospace" font-size="10" fill="#a1a1aa">Reverse · on ink</text>
  <text x="24" y="246" font-family="IBM Plex Mono, monospace" font-size="11" fill="#52525b">Direction ${rank} · ${axisCaption(axis, prompt.metadata?.creativeTerritory ?? null)} · ${brand}</text>
  <text x="24" y="264" font-family="IBM Plex Mono, monospace" font-size="9" fill="#a1a1aa">Scaffolds mirror brief DNA — apply clear-space rules to the raster/vector master in images/</text>
</svg>
`;
}

export function buildColorSystemSvg(brief: DesignBrief, companyName: string): string {
  const palette = brief.colorPalette || 'black_white';
  const swatches: Array<{ hex: string; label: string }> = (() => {
    switch (palette) {
      case 'corporate_blue':
        return [
          { hex: '#0B1F3A', label: 'Navy' },
          { hex: '#1D4ED8', label: 'Blue' },
          { hex: '#E5E7EB', label: 'Gray' },
          { hex: '#FFFFFF', label: 'White' },
        ];
      case 'red_accent':
        return [
          { hex: '#111111', label: 'Black' },
          { hex: '#B91C1C', label: 'Red' },
          { hex: '#F5F5F5', label: 'Off-white' },
          { hex: '#FFFFFF', label: 'White' },
        ];
      case 'two_color':
        return [
          { hex: '#18181B', label: 'Ink' },
          { hex: '#2563EB', label: 'Accent' },
          { hex: '#FAFAFA', label: 'Paper' },
          { hex: '#FFFFFF', label: 'White' },
        ];
      case 'monochrome':
        return [
          { hex: '#09090B', label: 'Black' },
          { hex: '#52525B', label: 'Zinc' },
          { hex: '#A1A1AA', label: 'Mute' },
          { hex: '#FAFAFA', label: 'Paper' },
        ];
      default:
        return [
          { hex: '#111111', label: 'Black' },
          { hex: '#FFFFFF', label: 'White' },
          { hex: '#E4E4E7', label: 'Rule' },
          { hex: '#71717A', label: 'Caption' },
        ];
    }
  })();

  const blocks = swatches
    .map((s, i) => {
      const x = 40 + i * 100;
      return `
      <rect x="${x}" y="60" width="80" height="80" fill="${s.hex}" stroke="#d4d4d8"/>
      <text x="${x}" y="160" font-family="monospace" font-size="11" fill="#3f3f46">${s.label}</text>
      <text x="${x}" y="176" font-family="monospace" font-size="10" fill="#71717a">${s.hex}</text>
    `;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 200" width="480" height="200">
  <rect width="480" height="200" fill="#fafafa"/>
  <text x="40" y="36" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#18181b">${escapeXml(companyName || 'Brand')} · color system</text>
  <text x="40" y="52" font-family="monospace" font-size="10" fill="#71717a">Palette: ${escapeXml(palette)}</text>
  ${blocks}
</svg>
`;
}

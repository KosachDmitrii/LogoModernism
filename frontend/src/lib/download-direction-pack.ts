import type { BrainPartnerState, ComposedPrompt, DesignBrief } from '../types';
import { resolveApiUrl } from './api-base';
import {
  buildColorSystemSvg,
  buildConstructionSvg,
  buildUsageSheetSvg,
} from './brand-pack/construction-svg';
import {
  buildBrandGuidelinesHtml,
  buildPresentationHtml,
} from './brand-pack/guidelines-html';
import { enrichPack, type EnrichedPack } from './brand-pack/pack-enrichment';
import { buildZipBlob, triggerBlobDownload, type ZipEntry } from './zip';

export interface DirectionPackInput {
  companyName: string;
  industry: string;
  designBrief: DesignBrief;
  prompts: ComposedPrompt[];
  brainPartner: BrainPartnerState | null;
  locale: 'en' | 'ru';
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'project'
  );
}

function extensionFromUrl(url: string): string {
  const match = url.match(/\.(png|jpe?g|webp|gif)(?:\?|$)/i);
  return match?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'png';
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(resolveApiUrl(url));
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function buildReadme(pack: EnrichedPack): string {
  const isRu = pack.locale === 'ru';
  const n = pack.directions.length;
  const lines: string[] = [];

  lines.push(isRu ? '# Бренд-пакет Logo Modernism' : '# Logo Modernism Brand Pack');
  lines.push('');
  lines.push(
    isRu
      ? `${n} направлен${n === 1 ? 'ие' : n < 5 ? 'ия' : 'ий'} для ${pack.companyName || 'проекта'}. Мастер-знак — в images/. Construction — структурный эскиз.`
      : `${n} direction${n === 1 ? '' : 's'} for ${pack.companyName || 'the project'}. Master mark lives in images/. Construction is a structural sketch.`,
  );
  lines.push('');
  lines.push(`## ${isRu ? 'Как пользоваться' : 'How to use'}`);
  lines.push(
    isRu
      ? '1. Откройте `presentation.html` для показа клиенту.\n2. Откройте `brand-guidelines.html` для полного гайда.\n3. Берите растр из `images/` как мастер; SVG в `construction/` — опора геометрии.'
      : '1. Open `presentation.html` for the client walkthrough.\n2. Open `brand-guidelines.html` for the full guide.\n3. Use rasters in `images/` as the master; SVGs in `construction/` are geometry scaffolds.',
  );
  lines.push('');
  lines.push(`## ${isRu ? 'Проект' : 'Project'}`);
  lines.push(`- ${isRu ? 'Компания' : 'Company'}: ${pack.companyName.trim() || '—'}`);
  lines.push(`- ${isRu ? 'Индустрия' : 'Industry'}: ${pack.industry || '—'}`);
  lines.push(`- ${isRu ? 'Палитра' : 'Palette'}: ${pack.designBrief.colorPalette || 'black_white'}`);
  if (pack.selectedTerritory) {
    lines.push(`- Territory: ${pack.selectedTerritory.name} — ${pack.selectedTerritory.thesis}`);
  }
  if (pack.packCritique) {
    lines.push(`- Critique: ${pack.packCritique.overallScore.toFixed(1)}/10`);
  }
  lines.push('');
  lines.push(`## ${isRu ? 'Направления' : 'Directions'}`);
  pack.directions.forEach((dir) => {
    lines.push('');
    lines.push(`### ${dir.rank}. ${(dir.prompt.scores?.promptQuality ?? 0).toFixed(1)}/10`);
    if (dir.territory) lines.push(`- Territory: ${dir.territory.name}`);
    lines.push(`- Why: ${dir.reasoning}`);
    const anchors =
      dir.principles.length > 0
        ? dir.principles.map((p) => p.name).join(', ')
        : dir.cues.join(', ');
    if (anchors) lines.push(`- Anchors: ${anchors}`);
    if (dir.imageFiles.length) lines.push(`- Master: ${dir.imageFiles.join(', ')}`);
  });
  lines.push('');
  return lines.join('\n');
}

function buildClientNotes(pack: EnrichedPack): string {
  const isRu = pack.locale === 'ru';
  const n = pack.directions.length;
  const lines: string[] = [];

  lines.push(
    isRu
      ? `# Варианты логотипа${pack.companyName.trim() ? ` — ${pack.companyName.trim()}` : ''}`
      : `# Logo directions${pack.companyName.trim() ? ` — ${pack.companyName.trim()}` : ''}`,
  );
  lines.push('');
  lines.push(
    isRu
      ? `Индустрия: ${pack.industry || '—'}. Ниже ${n} направлен${n === 1 ? 'ие' : n < 5 ? 'ия' : 'ий'} с обоснованием.`
      : `Industry: ${pack.industry || '—'}. Below: ${n} direction${n === 1 ? '' : 's'} with rationale.`,
  );

  if (pack.selectedTerritory) {
    lines.push('');
    lines.push(
      isRu
        ? `Креативная линия: **${pack.selectedTerritory.name}** — ${pack.selectedTerritory.thesis}`
        : `Creative line: **${pack.selectedTerritory.name}** — ${pack.selectedTerritory.thesis}`,
    );
  }

  pack.directions.forEach((dir) => {
    lines.push('');
    lines.push(`## ${isRu ? 'Вариант' : 'Option'} ${dir.rank}`);
    lines.push(dir.reasoning);
    const anchors =
      dir.principles.length > 0
        ? dir.principles.map((p) => p.name).join(', ')
        : dir.cues.join(', ');
    if (anchors) {
      lines.push(isRu ? `Опоры: ${anchors}.` : `Anchors: ${anchors}.`);
    }
    if (dir.imageFiles[0]) {
      lines.push(
        isRu
          ? `Визуал: ${dir.imageFiles[0]}`
          : `Visual: ${dir.imageFiles[0]}`,
      );
    }
  });

  if (pack.packCritique) {
    lines.push('');
    lines.push(
      isRu
        ? `Critique: ${pack.packCritique.overallScore.toFixed(1)}/10`
        : `Critique: ${pack.packCritique.overallScore.toFixed(1)}/10`,
    );
  }

  lines.push('');
  lines.push(
    isRu
      ? '_Откройте presentation.html и brand-guidelines.html из архива._'
      : '_Open presentation.html and brand-guidelines.html from the archive._',
  );
  return lines.join('\n');
}

function buildPromptsJson(pack: EnrichedPack): string {
  return JSON.stringify(
    {
      companyName: pack.companyName,
      industry: pack.industry,
      generatedAt: new Date().toISOString(),
      directionCount: pack.directions.length,
      critique: pack.packCritique
        ? {
            overallScore: pack.packCritique.overallScore,
            feedback: pack.packCritique.feedback,
          }
        : null,
      territory: pack.selectedTerritory
        ? {
            id: pack.selectedTerritory.id,
            name: pack.selectedTerritory.name,
            thesis: pack.selectedTerritory.thesis,
          }
        : null,
      directions: pack.directions.map((dir) => ({
        rank: dir.rank,
        id: dir.prompt.id,
        text: dir.prompt.text,
        quality: dir.prompt.scores?.promptQuality ?? null,
        era: dir.prompt.metadata?.era,
        principles: dir.principles,
        cues: dir.cues,
        reasoning: dir.reasoning,
        territory: dir.territory
          ? { id: dir.territory.id, name: dir.territory.name, thesis: dir.territory.thesis }
          : null,
        images: dir.imageFiles,
      })),
    },
    null,
    2,
  );
}

export async function downloadDirectionPack(input: DirectionPackInput): Promise<void> {
  if (input.prompts.length === 0) {
    throw new Error(input.locale === 'ru' ? 'Нет направлений для пакета' : 'No directions to pack');
  }

  const pack = enrichPack(input);
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];

  // Fetch rasters first so HTML can point at real masters.
  await Promise.all(
    pack.directions.map(async (dir) => {
      const logos = dir.prompt.logos ?? [];
      const files: string[] = [];
      await Promise.all(
        logos.map(async (logo, logoIndex) => {
          const bytes = await fetchImageBytes(logo.url);
          if (!bytes) return;
          const ext = extensionFromUrl(logo.url);
          const name = `images/direction-${dir.rank}-${logoIndex + 1}.${ext}`;
          entries.push({ name, data: bytes });
          files.push(name);
        }),
      );
      dir.imageFiles = files;
      dir.hasRaster = files.length > 0;
    }),
  );

  pack.directions.forEach((dir) => {
    entries.push({
      name: `construction/direction-${dir.rank}.svg`,
      data: encoder.encode(
        buildConstructionSvg(dir.prompt, pack.companyName, pack.designBrief, dir.rank),
      ),
    });
    entries.push({
      name: `usage/direction-${dir.rank}.svg`,
      data: encoder.encode(
        buildUsageSheetSvg(dir.prompt, pack.companyName, pack.designBrief, dir.rank),
      ),
    });
  });

  entries.push(
    { name: 'README.md', data: encoder.encode(buildReadme(pack)) },
    { name: 'client-notes.md', data: encoder.encode(buildClientNotes(pack)) },
    { name: 'brand-guidelines.html', data: encoder.encode(buildBrandGuidelinesHtml(pack)) },
    { name: 'presentation.html', data: encoder.encode(buildPresentationHtml(pack)) },
    { name: 'prompts.json', data: encoder.encode(buildPromptsJson(pack)) },
    {
      name: 'system/color.svg',
      data: encoder.encode(buildColorSystemSvg(pack.designBrief, pack.companyName)),
    },
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `logo-brand-pack-${slugify(pack.companyName || pack.industry)}-${stamp}.zip`;
  triggerBlobDownload(buildZipBlob(entries), filename);
}

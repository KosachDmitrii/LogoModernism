import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import { defaultPaletteColors, paletteNeedsColorSelections, resolveColorSelections } from '@logo-platform/shared';
import { analyzeComposition } from '../../api';
import { useAppStore } from '../../store';
import { applyStyleToBrief } from '../../lib/apply-brief';
import type { DesignBrief } from '../../types';
import { parseMarkTypeFromBrief } from '../../lib/brief-mappers';
import { useT, type MessageKey } from '../../i18n';
import { formatError } from '../../lib/api-error';
import { BriefColorSelections } from './BriefColorSelections';
import { BriefRadioOption } from './BriefRadioOption';

type RenderEffectMode = 'flat' | 'shadow' | '3d' | 'shadow_3d';

function renderEffectMode(allowShadows: boolean, allowPhotoreal: boolean): RenderEffectMode {
  if (allowShadows && allowPhotoreal) return 'shadow_3d';
  if (allowShadows) return 'shadow';
  if (allowPhotoreal) return '3d';
  return 'flat';
}

function renderEffectFlags(mode: RenderEffectMode): Pick<DesignBrief, 'allowShadows' | 'allowPhotoreal'> {
  return {
    allowShadows: mode === 'shadow' || mode === 'shadow_3d',
    allowPhotoreal: mode === '3d' || mode === 'shadow_3d',
  };
}

const RENDER_EFFECT_OPTIONS: Array<{ value: RenderEffectMode; labelKey: MessageKey; hintKey: MessageKey }> = [
  { value: 'flat', labelKey: 'brief.style.renderFlat', hintKey: 'brief.style.renderFlatHint' },
  { value: 'shadow', labelKey: 'brief.style.allowShadows', hintKey: 'brief.style.allowShadowsHint' },
  { value: '3d', labelKey: 'brief.style.allow3d', hintKey: 'brief.style.allow3dHint' },
  { value: 'shadow_3d', labelKey: 'brief.style.renderShadow3d', hintKey: 'brief.style.renderShadow3dHint' },
];

const COLOR_OPTIONS: Array<{ value: DesignBrief['colorPalette']; labelKey: MessageKey }> = [
  { value: '', labelKey: 'brief.style.autoFromRules' },
  { value: 'black_white', labelKey: 'brief.style.blackWhite' },
  { value: 'monochrome', labelKey: 'brief.style.monochrome' },
  { value: 'two_color', labelKey: 'brief.style.twoColor' },
  { value: 'limited', labelKey: 'brief.style.limited' },
  { value: 'multi_color', labelKey: 'brief.style.multiColor' },
  { value: 'custom', labelKey: 'brief.style.customColors' },
];

function defaultColorSelections(palette: DesignBrief['colorPalette']): string[] {
  if (!paletteNeedsColorSelections(palette)) return [];
  return defaultPaletteColors(palette);
}

export function BriefStyleSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);

  const analysis = useMutation({
    mutationFn: () =>
      analyzeComposition({
        industry: industry.trim(),
        markType: parseMarkTypeFromBrief(designBrief),
      }),
    onSuccess: (result) => {
      const layout = result.recommendedLayout?.name ?? result.recommendedLayout;
      const brief = applyStyleToBrief(designBrief, {
        colorPalette: designBrief.colorPalette,
        composition: typeof layout === 'string' ? layout : undefined,
      });
      updateDesignBrief({
        ...brief,
        colorSelections: resolveColorSelections(designBrief.colorPalette, designBrief.colorSelections),
      });
      onStepComplete?.();
    },
  });

  const needsColors = paletteNeedsColorSelections(designBrief.colorPalette);
  const colorSelections = resolveColorSelections(designBrief.colorPalette, designBrief.colorSelections);

  useEffect(() => {
    if (!needsColors) return;
    const resolved = resolveColorSelections(designBrief.colorPalette, designBrief.colorSelections);
    const stored = designBrief.colorSelections;
    if (
      stored.length !== resolved.length ||
      stored.some((color, index) => color !== resolved[index])
    ) {
      updateDesignBrief({ colorSelections: resolved });
    }
  }, [designBrief.colorPalette, designBrief.colorSelections, needsColors, updateDesignBrief]);

  const colorSlotsReady =
    !needsColors ||
    designBrief.colorSelections.length >=
      (designBrief.colorPalette === 'two_color'
        ? 2
        : designBrief.colorPalette === 'limited'
          ? 2
          : 1);

  const canApply = Boolean(industry.trim()) && Boolean(designBrief.colorPalette) && colorSlotsReady;
  const renderEffect = renderEffectMode(designBrief.allowShadows, designBrief.allowPhotoreal);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">{t('brief.style.colorPalette')}</label>
        <select
          value={designBrief.colorPalette}
          onChange={(e) => {
            const colorPalette = e.target.value as DesignBrief['colorPalette'];
            updateDesignBrief({
              colorPalette,
              colorSelections: paletteNeedsColorSelections(colorPalette)
                ? defaultColorSelections(colorPalette)
                : [],
            });
          }}
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <BriefColorSelections
        palette={designBrief.colorPalette}
        selections={colorSelections}
        onChange={(next) => updateDesignBrief({ colorSelections: next })}
      />

      <div className="space-y-2 pt-1">
        <p className="text-xs font-medium text-zinc-500">{t('brief.style.renderEffects')}</p>
        {RENDER_EFFECT_OPTIONS.map((option) => (
          <BriefRadioOption
            key={option.value}
            name="brief-render-effect"
            value={option.value}
            checked={renderEffect === option.value}
            onChange={() => updateDesignBrief(renderEffectFlags(option.value))}
          >
            <span className="font-medium text-zinc-200">{t(option.labelKey)}</span>
            <span className="block mt-0.5 text-zinc-500">{t(option.hintKey)}</span>
          </BriefRadioOption>
        ))}
      </div>

      <button
        type="button"
        disabled={!canApply || analysis.isPending}
        onClick={(e) => {
          e.stopPropagation();
          analysis.mutate();
        }}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {analysis.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Palette size={14} />
        )}
        {t('brief.style.apply')}
      </button>

      {!industry.trim() && (
        <p className="text-xs text-zinc-600">{t('brief.typography.setIndustryFirst')}</p>
      )}
      {industry.trim() && !designBrief.colorPalette && (
        <p className="text-xs text-zinc-600">{t('brief.style.choosePalette')}</p>
      )}
      {needsColors && !colorSlotsReady && (
        <p className="text-xs text-amber-400/90">{t('brief.style.pickColorsBeforeApply')}</p>
      )}

      {analysis.isError && (
        <p className="text-xs text-red-400">
          {formatError(analysis.error, t)}
        </p>
      )}

      {analysis.data && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <p className="text-xs text-emerald-400/80">{t('brief.style.applied')}</p>
          {analysis.data.recommendedLayout?.name && (
            <p className="text-xs text-zinc-500">
              {t('brief.style.layoutLabel')}: {analysis.data.recommendedLayout.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

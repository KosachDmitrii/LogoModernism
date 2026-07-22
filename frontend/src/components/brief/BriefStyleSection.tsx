import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import { RadioGroup } from '@base-ui/react/radio-group';
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
import { CustomSelect } from '../CustomSelect';
import { useToast } from '../ToastProvider';
import { Button } from '../ui/Button';

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

interface StyleDraft {
  colorPalette: DesignBrief['colorPalette'];
  colorSelections: string[];
  renderEffect: RenderEffectMode;
}

function draftFromBrief(brief: DesignBrief): StyleDraft {
  const colorPalette = brief.colorPalette;
  return {
    colorPalette,
    colorSelections: paletteNeedsColorSelections(colorPalette)
      ? resolveColorSelections(colorPalette, brief.colorSelections)
      : [],
    renderEffect: renderEffectMode(brief.allowShadows, brief.allowPhotoreal),
  };
}

function draftsEqual(a: StyleDraft, b: StyleDraft): boolean {
  if (a.colorPalette !== b.colorPalette || a.renderEffect !== b.renderEffect) return false;
  if (a.colorSelections.length !== b.colorSelections.length) return false;
  return a.colorSelections.every((color, index) => color === b.colorSelections[index]);
}

export function BriefStyleSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const toast = useToast();
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);

  const appliedStyleKey = [
    designBrief.colorPalette,
    designBrief.colorSelections.join('\0'),
    designBrief.allowShadows ? '1' : '0',
    designBrief.allowPhotoreal ? '1' : '0',
  ].join('|');
  const applied = useMemo(
    () => draftFromBrief(designBrief),
    // Recreate only when committed style fields change (key), not on every brief edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appliedStyleKey],
  );
  const [draft, setDraft] = useState<StyleDraft>(() => draftFromBrief(designBrief));

  // Reset local draft when the committed brief style changes (e.g. after Apply).
  useEffect(() => {
    setDraft(applied);
  }, [appliedStyleKey, applied]);

  const analysis = useMutation({
    mutationFn: (next: StyleDraft) =>
      analyzeComposition({
        industry: industry.trim(),
        markType: parseMarkTypeFromBrief(designBrief),
      }).then((result) => ({ result, next })),
    onSuccess: ({ result, next }) => {
      const selections = paletteNeedsColorSelections(next.colorPalette)
        ? resolveColorSelections(next.colorPalette, next.colorSelections)
        : [];
      const layout = result.recommendedLayout?.name ?? result.recommendedLayout;
      const brief = applyStyleToBrief(
        {
          ...designBrief,
          colorPalette: next.colorPalette,
          colorSelections: selections,
          ...renderEffectFlags(next.renderEffect),
        },
        {
          colorPalette: next.colorPalette,
          composition: typeof layout === 'string' ? layout : undefined,
        },
      );
      updateDesignBrief({
        ...brief,
        colorSelections: selections,
        ...renderEffectFlags(next.renderEffect),
        styleApplied: true,
      });
      onStepComplete?.();
    },
    onError: (error) => toast.error(formatError(error, t)),
  });

  const needsColors = paletteNeedsColorSelections(draft.colorPalette);
  const colorSelections = needsColors
    ? resolveColorSelections(draft.colorPalette, draft.colorSelections)
    : [];

  const colorSlotsReady =
    !needsColors ||
    colorSelections.length >=
      (draft.colorPalette === 'two_color' ? 2 : draft.colorPalette === 'limited' ? 2 : 1);

  const isDirty = !draftsEqual(draft, applied);
  const canApply =
    Boolean(industry.trim()) && Boolean(draft.colorPalette) && colorSlotsReady && isDirty;

  const colorPaletteOptions = useMemo(
    () => COLOR_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">{t('brief.style.colorPalette')}</label>
        <CustomSelect
          value={draft.colorPalette}
          onChange={(colorPalette) => {
            const palette = colorPalette as DesignBrief['colorPalette'];
            setDraft((prev) => ({
              ...prev,
              colorPalette: palette,
              colorSelections: paletteNeedsColorSelections(palette)
                ? defaultColorSelections(palette)
                : [],
            }));
          }}
          options={colorPaletteOptions}
          size="sm"
        />
      </div>

      <BriefColorSelections
        palette={draft.colorPalette}
        selections={colorSelections}
        onChange={(next) => setDraft((prev) => ({ ...prev, colorSelections: next }))}
      />

      <div className="space-y-2 pt-1">
        <p className="text-xs font-medium text-zinc-500">{t('brief.style.renderEffects')}</p>
        <RadioGroup
          value={draft.renderEffect}
          onValueChange={(value) =>
            setDraft((prev) => ({ ...prev, renderEffect: value as RenderEffectMode }))
          }
          aria-label={t('brief.style.renderEffects')}
          className="space-y-2"
        >
          {RENDER_EFFECT_OPTIONS.map((option) => (
            <BriefRadioOption
              key={option.value}
              name="brief-render-effect"
              value={option.value}
              checked={draft.renderEffect === option.value}
              onChange={() => setDraft((prev) => ({ ...prev, renderEffect: option.value }))}
            >
              <span className="font-medium text-zinc-200">{t(option.labelKey)}</span>
              <span className="block mt-0.5 text-zinc-500">{t(option.hintKey)}</span>
            </BriefRadioOption>
          ))}
        </RadioGroup>
      </div>

      <Button
        type="button"
        disabled={!canApply || analysis.isPending}
        onClick={(e) => {
          e.stopPropagation();
          analysis.mutate({
            ...draft,
            colorSelections: needsColors
              ? resolveColorSelections(draft.colorPalette, draft.colorSelections)
              : [],
          });
        }}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {analysis.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Palette size={14} />
        )}
        {t('brief.style.apply')}
      </Button>

      {!industry.trim() && (
        <p className="text-xs text-zinc-600">{t('brief.typography.setIndustryFirst')}</p>
      )}
      {industry.trim() && !draft.colorPalette && (
        <p className="text-xs text-zinc-600">{t('brief.style.choosePalette')}</p>
      )}
      {needsColors && !colorSlotsReady && (
        <p className="text-xs text-amber-400/90">{t('brief.style.pickColorsBeforeApply')}</p>
      )}
      {industry.trim() && draft.colorPalette && colorSlotsReady && isDirty && (
        <p className="text-xs text-amber-400/90">{t('brief.style.applyToConfirm')}</p>
      )}

      {analysis.data && !isDirty && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <p className="text-xs text-emerald-400/80">{t('brief.style.applied')}</p>
          {analysis.data.result.recommendedLayout?.name && (
            <p className="text-xs text-zinc-500">
              {t('brief.style.layoutLabel')}: {analysis.data.result.recommendedLayout.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

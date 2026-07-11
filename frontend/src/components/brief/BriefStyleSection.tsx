import { useMutation } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import { analyzeComposition } from '../../api';
import { useAppStore } from '../../store';
import { applyStyleToBrief } from '../../lib/apply-brief';
import type { DesignBrief } from '../../types';
import { parseMarkTypeFromBrief } from '../../lib/brief-mappers';
import { useT, type MessageKey } from '../../i18n';
import { formatError } from '../../lib/api-error';

const COLOR_OPTIONS: Array<{ value: DesignBrief['colorPalette']; labelKey: MessageKey }> = [
  { value: '', labelKey: 'brief.style.autoFromRules' },
  { value: 'black_white', labelKey: 'brief.style.blackWhite' },
  { value: 'monochrome', labelKey: 'brief.style.monochrome' },
  { value: 'two_color', labelKey: 'brief.style.twoColor' },
  { value: 'limited', labelKey: 'brief.style.limited' },
];

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
      updateDesignBrief(brief);
      onStepComplete?.();
    },
  });

  const canApply = Boolean(industry.trim()) && Boolean(designBrief.colorPalette);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">{t('brief.style.colorPalette')}</label>
        <select
          value={designBrief.colorPalette}
          onChange={(e) =>
            updateDesignBrief({
              colorPalette: e.target.value as DesignBrief['colorPalette'],
              colorSelections: [],
              allowShadows: false,
              allowPhotoreal: false,
            })
          }
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
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

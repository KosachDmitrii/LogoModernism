import { useMutation } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import { analyzeComposition } from '../../api';
import { useAppStore } from '../../store';
import { applyStyleToBrief } from '../../lib/apply-brief';
import type { DesignBrief } from '../../types';
import { parseMarkTypeFromBrief } from '../../lib/brief-mappers';

const COLOR_OPTIONS: Array<{ value: DesignBrief['colorPalette']; label: string }> = [
  { value: '', label: 'Auto (from rules)' },
  { value: 'black_white', label: 'Black & white only' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'two_color', label: 'Two-color max' },
  { value: 'limited', label: 'Limited palette' },
];

export function BriefStyleSection({ onStepComplete }: { onStepComplete?: () => void }) {
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
        <label className="block text-[10px] font-medium text-zinc-500 mb-1">Color palette</label>
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
              {option.label}
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
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Palette size={12} />
        )}
        Apply style to brief
      </button>

      {!industry.trim() && (
        <p className="text-[10px] text-zinc-600">Set industry on the Project step first.</p>
      )}
      {industry.trim() && !designBrief.colorPalette && (
        <p className="text-[10px] text-zinc-600">Choose a color palette, then apply.</p>
      )}

      {analysis.isError && (
        <p className="text-[10px] text-red-400">
          {analysis.error instanceof Error ? analysis.error.message : 'Style analysis failed'}
        </p>
      )}

      {analysis.data && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <p className="text-[10px] text-emerald-400/80">Style applied to brief</p>
          {analysis.data.recommendedLayout?.name && (
            <p className="text-[10px] text-zinc-500">
              Layout: {analysis.data.recommendedLayout.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

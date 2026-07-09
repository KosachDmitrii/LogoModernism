import { useMutation } from '@tanstack/react-query';
import { Loader2, Type } from 'lucide-react';
import { analyzeBrandDNA } from '../../api';
import { useAppStore } from '../../store';
import type { DesignBrief } from '../../types';

const MARK_TYPES = [
  { value: 'wordmark', label: 'Wordmark' },
  { value: 'lettermark', label: 'Lettermark' },
  { value: 'combination', label: 'Combination' },
] as const;

const TYPOGRAPHY_STYLES = [
  { value: 'standard', label: 'Standard' },
  { value: 'constructed', label: 'Constructed' },
] as const;

type MarkType = (typeof MARK_TYPES)[number]['value'];
type TypographyStyle = (typeof TYPOGRAPHY_STYLES)[number]['value'];

interface BriefTypographySectionProps {
  onStepComplete?: () => void;
}

export function BriefTypographySection({ onStepComplete }: BriefTypographySectionProps) {
  const companyName = useAppStore((s) => s.companyName);
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const applyBrandDNA = useAppStore((s) => s.applyBrandDNA);

  const markType = (designBrief.markType || 'combination') as MarkType;
  const typographyStyle = (designBrief.typographyStyle || 'standard') as TypographyStyle;

  const brandName = companyName.trim();
  const requiresName =
    markType === 'wordmark' || markType === 'lettermark' || typographyStyle === 'constructed';

  const analysis = useMutation({
    mutationFn: () => {
      const brief = useAppStore.getState().designBrief;
      const selectedMarkType = (brief.markType || 'combination') as MarkType;
      const selectedTypographyStyle = (brief.typographyStyle || 'standard') as TypographyStyle;
      const name = useAppStore.getState().companyName.trim();

      return analyzeBrandDNA({
        companyName: name || industry.trim() || 'Brand',
        industry: industry.trim(),
        markType: selectedMarkType,
        typographyStyle: selectedTypographyStyle,
      });
    },
    onSuccess: (result) => {
      const brief = useAppStore.getState().designBrief;
      const name = useAppStore.getState().companyName.trim() || industry.trim();
      applyBrandDNA(name, industry.trim(), {
        ...result,
        markType: brief.markType || result.markType,
        typographyStyle: brief.typographyStyle || result.typographyStyle,
      });
      onStepComplete?.();
    },
  });

  const result = analysis.data;
  const canAnalyze = Boolean(industry.trim()) && (!requiresName || Boolean(brandName));

  const disabledReason = !industry.trim()
    ? 'Set industry on the Project step first.'
    : requiresName && !brandName
      ? 'Add Company Name on the Project step for wordmark, lettermark, or constructed type.'
      : null;

  return (
    <div className="space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-zinc-500 mb-1">Mark type</label>
          <select
            value={markType}
            onChange={(e) =>
              updateDesignBrief({ markType: e.target.value as DesignBrief['markType'] })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-zinc-600"
          >
            {MARK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 mb-1">Typography style</label>
          <select
            value={typographyStyle}
            onChange={(e) =>
              updateDesignBrief({
                typographyStyle: e.target.value as DesignBrief['typographyStyle'],
              })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-zinc-600"
          >
            {TYPOGRAPHY_STYLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        disabled={!canAnalyze || analysis.isPending}
        onClick={() => analysis.mutate()}
        className="w-full px-3 py-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {analysis.isPending && <Loader2 size={12} className="animate-spin" />}
        Analyze Typography
      </button>

      {disabledReason && (
        <p className="text-[10px] text-amber-300/80">{disabledReason}</p>
      )}

      {analysis.isError && (
        <p className="text-[10px] text-red-400">
          {analysis.error instanceof Error ? analysis.error.message : 'Typography analysis failed'}
        </p>
      )}

      {result && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-400 line-clamp-3">{result.narrative}</p>
          <div className="flex flex-wrap gap-1">
            <Tag>{result.personality}</Tag>
            <Tag>{result.markType}</Tag>
            <Tag>{result.psychologyProfile.primaryEmotion}</Tag>
          </div>
          <p className="text-[10px] text-emerald-400/80">Applied to brief</p>
          <div className="pt-1 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
              <Type size={10} /> {result.typography.primaryRecommendation.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 capitalize">
      {children}
    </span>
  );
}

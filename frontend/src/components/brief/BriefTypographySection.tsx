import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Type } from 'lucide-react';
import { analyzeBrandDNA } from '../../api';
import { useAppStore } from '../../store';
import type { DesignBrief } from '../../types';
import { useT } from '../../i18n';
import { formatError } from '../../lib/api-error';
import { markTypeLabel } from '../../lib/translate-labels';

const MARK_TYPES = [
  { value: 'wordmark', labelKey: 'brief.typography.wordmark' },
  { value: 'lettermark', labelKey: 'brief.typography.lettermark' },
  { value: 'combination', labelKey: 'brief.typography.combination' },
] as const;

const TYPOGRAPHY_STYLES = [
  { value: 'standard', labelKey: 'brief.typography.standard' },
  { value: 'constructed', labelKey: 'brief.typography.constructed' },
] as const;

type MarkType = (typeof MARK_TYPES)[number]['value'];
type TypographyStyle = (typeof TYPOGRAPHY_STYLES)[number]['value'];

interface BriefTypographySectionProps {
  onStepComplete?: () => void;
}

export function BriefTypographySection({ onStepComplete }: BriefTypographySectionProps) {
  const t = useT();
  const companyName = useAppStore((s) => s.companyName);
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const applyBrandDNA = useAppStore((s) => s.applyBrandDNA);

  const markType = (designBrief.markType || 'combination') as MarkType;
  const typographyStyle = (designBrief.typographyStyle || 'standard') as TypographyStyle;

  useEffect(() => {
    if (!designBrief.markType) {
      updateDesignBrief({ markType: 'combination' });
    }
  }, [designBrief.markType, updateDesignBrief]);

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
        companyName: name,
        industry: industry.trim(),
        markType: name ? selectedMarkType : undefined,
        typographyStyle: name ? selectedTypographyStyle : undefined,
      });
    },
    onSuccess: (result) => {
      const brief = useAppStore.getState().designBrief;
      const name = useAppStore.getState().companyName.trim();
      if (!name) return;
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
    ? t('brief.typography.setIndustryFirst')
    : requiresName && !brandName
      ? t('brief.typography.addCompanyName')
      : null;

  return (
    <div className="space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t('brief.typography.markType')}</label>
          <select
            value={markType}
            onChange={(e) =>
              updateDesignBrief({ markType: e.target.value as DesignBrief['markType'] })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-zinc-600"
          >
            {MARK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t('brief.typography.typographyStyle')}</label>
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
                {t(option.labelKey)}
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
        {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
        {t('brief.typography.analyze')}
      </button>

      {disabledReason && (
        <p className="text-xs text-amber-300/80">{disabledReason}</p>
      )}

      {analysis.isError && (
        <p className="text-xs text-red-400">
          {formatError(analysis.error, t)}
        </p>
      )}

      {result && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-400 line-clamp-3">{result.narrative}</p>
          <div className="flex flex-wrap gap-1">
            <Tag>{result.personality}</Tag>
            <Tag>{markTypeLabel(result.markType, t)}</Tag>
            <Tag>{result.psychologyProfile.primaryEmotion}</Tag>
          </div>
          <p className="text-xs text-emerald-400/80">{t('brief.typography.applied')}</p>
          <div className="pt-1 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
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
    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 capitalize">
      {children}
    </span>
  );
}

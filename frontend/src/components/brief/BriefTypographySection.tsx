import { useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Type } from 'lucide-react';
import { analyzeBrandDNA } from '../../api';
import { useAppStore } from '../../store';
import type { DesignBrief } from '../../types';
import { useT, type MessageKey } from '../../i18n';
import { formatError } from '../../lib/api-error';
import { markTypeLabel } from '../../lib/translate-labels';
import { CustomSelect } from '../CustomSelect';
import { useToast } from '../ToastProvider';
import { Button } from '../ui/Button';
import {
  deriveRebusWordmark,
  isRebusTypographyStyle,
  isTypographyStyle,
  normalizeTypographyStyleForMarkType,
  typographyStyleNeedsBrandName,
  typographyStylesForMarkType,
  type TypographyStyle,
} from '@logo-platform/shared';

type MarkType = 'wordmark' | 'lettermark' | 'combination';

const MARK_TYPES = [
  { value: 'wordmark', labelKey: 'brief.typography.wordmark', hintKey: 'brief.typography.markTypeHint.wordmark' },
  { value: 'lettermark', labelKey: 'brief.typography.lettermark', hintKey: 'brief.typography.markTypeHint.lettermark' },
  { value: 'combination', labelKey: 'brief.typography.combination', hintKey: 'brief.typography.markTypeHint.combination' },
] as const satisfies ReadonlyArray<{ value: MarkType; labelKey: MessageKey; hintKey: MessageKey }>;

const TYPOGRAPHY_STYLE_LABELS: Record<TypographyStyle, MessageKey> = {
  standard: 'brief.typography.standard',
  constructed: 'brief.typography.constructed',
  modified_glyph: 'brief.typography.modifiedGlyph',
  rebus: 'brief.typography.rebus',
  monogram_ligature: 'brief.typography.monogramLigature',
};

const TYPOGRAPHY_STYLE_HINTS: Record<TypographyStyle, MessageKey> = {
  standard: 'brief.typography.styleHint.standard',
  constructed: 'brief.typography.styleHint.constructed',
  modified_glyph: 'brief.typography.styleHint.modifiedGlyph',
  rebus: 'brief.typography.styleHint.rebus',
  monogram_ligature: 'brief.typography.styleHint.monogramLigature',
};

function syncTypographyPatch(
  markType: MarkType,
  typographyStyle: TypographyStyle,
): Partial<DesignBrief> {
  return {
    markType,
    typographyStyle,
    rebusWordmark: deriveRebusWordmark(typographyStyle),
  };
}

interface BriefTypographySectionProps {
  onStepComplete?: () => void;
}

export function BriefTypographySection({ onStepComplete }: BriefTypographySectionProps) {
  const t = useT();
  const toast = useToast();
  const companyName = useAppStore((s) => s.companyName);
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const applyBrandDNA = useAppStore((s) => s.applyBrandDNA);

  const markType = (designBrief.markType || 'combination') as MarkType;
  const rawTypographyStyle = designBrief.typographyStyle;
  const typographyStyle = (
    isTypographyStyle(rawTypographyStyle)
      ? normalizeTypographyStyleForMarkType(rawTypographyStyle, markType)
      : 'standard'
  ) as TypographyStyle;
  const availableStyles = typographyStylesForMarkType(markType);

  useEffect(() => {
    if (!designBrief.markType) {
      updateDesignBrief({ markType: 'combination' });
    }
  }, [designBrief.markType, updateDesignBrief]);

  useEffect(() => {
    const styleInput = isTypographyStyle(designBrief.typographyStyle)
      ? designBrief.typographyStyle
      : designBrief.rebusWordmark
        ? 'rebus'
        : undefined;
    const normalized = normalizeTypographyStyleForMarkType(styleInput, markType);
    const rebusWordmark = deriveRebusWordmark(normalized);
    const nextMarkType = rebusWordmark ? 'wordmark' : markType;
    const needsSync =
      designBrief.typographyStyle !== normalized ||
      designBrief.rebusWordmark !== rebusWordmark ||
      (rebusWordmark && designBrief.markType !== 'wordmark');

    if (needsSync) {
      updateDesignBrief(syncTypographyPatch(nextMarkType, normalized));
    }
  }, [
    designBrief.markType,
    designBrief.rebusWordmark,
    designBrief.typographyStyle,
    markType,
    updateDesignBrief,
  ]);

  const brandName = companyName.trim();
  const requiresName =
    markType === 'wordmark' ||
    markType === 'lettermark' ||
    typographyStyleNeedsBrandName(typographyStyle);

  const analysis = useMutation({
    mutationFn: () => {
      const brief = useAppStore.getState().designBrief;
      const selectedMarkType = (brief.markType || 'combination') as MarkType;
      const selectedTypographyStyle = (
        isTypographyStyle(brief.typographyStyle)
          ? normalizeTypographyStyleForMarkType(brief.typographyStyle, selectedMarkType)
          : 'standard'
      ) as TypographyStyle;
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
    onError: (error) => toast.error(formatError(error, t)),
  });

  const result = analysis.data;
  const canAnalyze = Boolean(industry.trim()) && (!requiresName || Boolean(brandName));

  const disabledReason = !industry.trim()
    ? t('brief.typography.setIndustryFirst')
    : requiresName && !brandName
      ? t('brief.typography.addCompanyName')
      : null;

  const handleMarkTypeChange = (nextMarkType: MarkType) => {
    const nextStyle = normalizeTypographyStyleForMarkType(typographyStyle, nextMarkType);
    updateDesignBrief(syncTypographyPatch(nextMarkType, nextStyle));
  };

  const handleTypographyStyleChange = (nextStyle: TypographyStyle) => {
    const nextMarkType = isRebusTypographyStyle(nextStyle) ? 'wordmark' : markType;
    updateDesignBrief(syncTypographyPatch(nextMarkType, nextStyle));
  };

  const markTypeHint = MARK_TYPES.find((option) => option.value === markType)?.hintKey;

  const markTypeOptions = useMemo(
    () => MARK_TYPES.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  const typographyStyleOptions = useMemo(
    () =>
      availableStyles.map((value) => ({
        value,
        label: t(TYPOGRAPHY_STYLE_LABELS[value]),
      })),
    [availableStyles, t],
  );

  return (
    <div className="space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-3 items-start">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t('brief.typography.markType')}</label>
          <CustomSelect
            value={markType}
            onChange={(next) => handleMarkTypeChange(next as MarkType)}
            options={markTypeOptions}
            size="sm"
            searchable={false}
          />
          {markTypeHint && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{t(markTypeHint)}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t('brief.typography.typographyStyle')}</label>
          <CustomSelect
            value={typographyStyle}
            onChange={(next) => {
              if (isTypographyStyle(next)) {
                handleTypographyStyleChange(next);
              }
            }}
            options={typographyStyleOptions}
            size="sm"
            searchable={false}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            {t(TYPOGRAPHY_STYLE_HINTS[typographyStyle])}
          </p>
        </div>
      </div>

      {isRebusTypographyStyle(typographyStyle) && !brandName && (
        <p className="text-xs text-amber-300/80">{t('brief.typography.rebusNeedsName')}</p>
      )}

      <Button
        type="button"
        disabled={!canAnalyze || analysis.isPending}
        onClick={() => analysis.mutate()}
        className="w-full px-3 py-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
        {t('brief.typography.analyze')}
      </Button>

      {disabledReason && (
        <p className="text-xs text-amber-300/80">{disabledReason}</p>
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

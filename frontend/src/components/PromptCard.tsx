import { motion } from 'framer-motion';
import { Copy, ImageIcon, Loader2, Download, Heart } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import type { ComposedPrompt, GeneratedImage, LogoFeedback, PromptScores } from '../types';
import type { MessageKey } from '../i18n/en';
import { ScoreBar } from './ScoreBar';
import { BriefCoverageMap } from './brief/BriefCoverageMap';
import { BrainExplainability } from './prompts/BrainExplainability';
import { LogoFeedbackBar } from './LogoFeedbackBar';
import { useAppStore, useIsGenerating, usePromptImages } from '../store';
import { generatePromptLogo, togglePromptSave } from '../api';
import { parseLogoMarkType, parseTypographyStyle } from '../lib/brief-mappers';
import { resolveApiUrl } from '../lib/api-base';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/permissions';
import { useT } from '../i18n';
import { formatError } from '../lib/api-error';
import { imageProviderLabel } from '../lib/translate-labels';
import { ApiAbortError } from '../lib/api-client';
import { useToast } from './ToastProvider';

const MAX_LOGOS = 3;

const PROMPT_SCORE_FIELDS: Array<{
  key: keyof PromptScores;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  { key: 'promptQuality', labelKey: 'prompts.card.scoreOverall', hintKey: 'prompts.card.scoreOverallHint' },
  { key: 'modernismScore', labelKey: 'prompts.card.scoreModernism', hintKey: 'prompts.card.scoreModernismHint' },
  { key: 'swissScore', labelKey: 'prompts.card.scoreSwiss', hintKey: 'prompts.card.scoreSwissHint' },
  { key: 'minimalismScore', labelKey: 'prompts.card.scoreMinimalism', hintKey: 'prompts.card.scoreMinimalismHint' },
  { key: 'geometryScore', labelKey: 'prompts.card.scoreGeometry', hintKey: 'prompts.card.scoreGeometryHint' },
  { key: 'cohesionScore', labelKey: 'prompts.card.scoreCohesion', hintKey: 'prompts.card.scoreCohesionHint' },
  { key: 'identityScore', labelKey: 'prompts.card.scoreIdentity', hintKey: 'prompts.card.scoreIdentityHint' },
  { key: 'brandRecognitionScore', labelKey: 'prompts.card.scoreBrandRecognition', hintKey: 'prompts.card.scoreBrandRecognitionHint' },
  { key: 'readabilityScore', labelKey: 'prompts.card.scoreReadability', hintKey: 'prompts.card.scoreReadabilityHint' },
  { key: 'scalabilityScore', labelKey: 'prompts.card.scoreScalability', hintKey: 'prompts.card.scoreScalabilityHint' },
];

interface PromptCardProps {
  prompt: ComposedPrompt;
  selected: boolean;
  onSelect: () => void;
  rank?: number;
  standalone?: boolean;
  onStateChange?: () => void;
  onSavedChange?: (saved: boolean) => void;
  getWorkSignal?: () => AbortSignal;
  onLogoGenerationStart?: () => void;
}

export function PromptCard({
  prompt,
  selected,
  onSelect,
  rank,
  standalone = false,
  onStateChange,
  onSavedChange,
  getWorkSignal,
  onLogoGenerationStart,
}: PromptCardProps) {
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const canUseProduct = hasPermission(profile?.accessRole, 'product.use');
  const companyName = useAppStore((s) => s.companyName);
  const designBrief = useAppStore((s) => s.designBrief);
  const startGenerating = useAppStore((s) => s.startGenerating);
  const stopGenerating = useAppStore((s) => s.stopGenerating);
  const setPromptLogos = useAppStore((s) => s.setPromptLogos);
  const setPromptSaved = useAppStore((s) => s.setPromptSaved);
  const updatePromptLogoFeedback = useAppStore((s) => s.updatePromptLogoFeedback);

  const storeLogos = usePromptImages(prompt.id);
  const logos = standalone ? (prompt.logos ?? []) : (prompt.logos ?? storeLogos);
  const isGenerating = useIsGenerating(prompt.id);
  const atLogoLimit = logos.length >= MAX_LOGOS;
  const saved = prompt.saved ?? false;

  const toggleSave = useMutation({
    mutationFn: () => togglePromptSave(prompt.id, !saved),
    onMutate: () => {
      onSavedChange?.(!saved);
      return { previousSaved: saved };
    },
    onSuccess: (result) => {
      if (standalone) {
        if (onSavedChange) onSavedChange(result.saved);
        else onStateChange?.();
      } else {
        setPromptSaved(prompt.id, result.saved);
      }
      toast.success(t(result.saved ? 'toast.promptSaved' : 'toast.promptRemoved'));
    },
    onError: (error, _variables, context) => {
      if (context) onSavedChange?.(context.previousSaved);
      toast.error(formatError(error, t));
    },
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.text);
      toast.success(t('toast.promptCopied'));
    } catch (error) {
      toast.error(formatError(error, t));
    }
  };

  const brandName =
    companyName.trim() || prompt.companyName?.trim() || undefined;

  const generateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (atLogoLimit || isGenerating) return;
    onLogoGenerationStart?.();
    startGenerating(prompt.id);
    try {
      const rawMarkType =
        designBrief.markType || prompt.metadata?.markType || undefined;
      const rawTypographyStyle =
        designBrief.typographyStyle || prompt.metadata?.typographyStyle || undefined;

      const result = await generatePromptLogo(
        prompt.id,
        {
          companyName: brandName,
          markType: parseLogoMarkType(rawMarkType, brandName),
          typographyStyle: brandName
            ? parseTypographyStyle(rawTypographyStyle)
            : undefined,
        },
        {
          signal: getWorkSignal?.(),
        },
      );
      if (standalone) {
        onStateChange?.();
      } else {
        setPromptLogos(prompt.id, result.logos);
      }
    } catch (err) {
      if (err instanceof ApiAbortError || (err instanceof Error && err.name === 'AbortError')) {
        return;
      }
      console.error(err);
      toast.error(formatError(err, t));
    } finally {
      stopGenerating(prompt.id);
    }
  };

  const handleLogoFeedback = (logoId: string, feedback: LogoFeedback) => {
    if (standalone) {
      onStateChange?.();
    } else {
      updatePromptLogoFeedback(prompt.id, logoId, feedback);
    }
  };

  return (
    <article
      onClick={onSelect}
      className={clsx(
        'rounded-xl border p-5 cursor-pointer transition-colors',
        selected
          ? 'border-zinc-400 bg-zinc-900/80'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {rank !== undefined && (
            <span className="text-xs font-mono text-zinc-500">#{rank}</span>
          )}
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {t('prompts.card.qualityPrefix')} {(prompt.scores?.promptQuality ?? 0).toFixed(1)}
          </span>
          <span className="text-xs text-zinc-500">{prompt.metadata?.era}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copy();
            }}
            title={t('common.copyPrompt')}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Copy size={16} />
          </button>
          {canUseProduct && (
            <button
              type="button"
              disabled={toggleSave.isPending}
              onClick={(e) => {
                e.stopPropagation();
                toggleSave.mutate();
              }}
              title={saved ? t('common.removeFromSaved') : t('common.savePrompt')}
              className={clsx(
                'p-1.5 rounded-lg transition-colors disabled:opacity-50',
                saved
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200',
              )}
            >
              {toggleSave.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Heart size={16} className={saved ? 'fill-current' : undefined} />
              )}
            </button>
          )}
        </div>
      </div>

      {canUseProduct && !standalone && (
        <button
          type="button"
          onClick={generateImage}
          disabled={isGenerating || atLogoLimit}
          className="mb-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          {isGenerating
            ? t('common.generating')
            : atLogoLimit
              ? t('prompts.card.maximumLogos', { max: MAX_LOGOS })
              : t('prompts.card.generateLogoImage', { current: logos.length, max: MAX_LOGOS })}
        </button>
      )}

      {logos.length > 0 && (
        <div
          className={clsx(
            'mb-4 grid gap-2',
            logos.length === 1 ? 'grid-cols-1' : logos.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {logos.map((image, index) => (
            <LogoImageTile
              key={image.id}
              image={image}
              promptId={prompt.id}
              index={index}
            >
              {canUseProduct && (
                <LogoFeedbackBar
                  promptId={prompt.id}
                  logo={image}
                  onUpdated={(feedback) => handleLogoFeedback(image.id, feedback)}
                />
              )}
            </LogoImageTile>
          ))}
        </div>
      )}

      <p className="font-mono text-sm leading-relaxed text-zinc-300 mb-4 whitespace-pre-wrap break-words">
        {prompt.text}
      </p>

      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 pt-3 border-t border-zinc-800"
        >
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {t('prompts.card.scoresTitle')}
          </p>
          {PROMPT_SCORE_FIELDS.map(({ key, labelKey, hintKey }) => (
            <ScoreBar
              key={key}
              label={t(labelKey)}
              hint={t(hintKey)}
              value={prompt.scores?.[key] ?? 0}
            />
          ))}
          {prompt.metadata.briefCoverage && prompt.metadata.briefCoverage.length > 0 && (
            <BriefCoverageMap
              designBrief={designBrief}
              promptCoverage={prompt.metadata.briefCoverage}
              compact
            />
          )}
          <BrainExplainability prompt={prompt} />
          <div className="flex flex-wrap gap-1.5 pt-2">
            {prompt.selectedPrinciples?.slice(0, 8).map((p) => (
              <span
                key={p.id}
                className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
              >
                {p.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

    </article>
  );
}

function LogoImageTile({
  image,
  promptId,
  index,
  children,
}: {
  image: GeneratedImage;
  promptId: string;
  index: number;
  children: ReactNode;
}) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const src = resolveApiUrl(image.url);

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
      <div className="rounded-lg overflow-hidden border-b border-zinc-800 bg-white">
        {failed ? (
          <div className="flex aspect-square items-center justify-center bg-zinc-100 px-3 text-center text-[11px] text-zinc-500">
            {t('prompts.card.logoUnavailable')}
          </div>
        ) : (
          <img
            src={src}
            alt={t('prompts.card.generatedLogoAlt', { index: index + 1 })}
            className="w-full aspect-square object-contain bg-white"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between bg-zinc-950">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wide truncate">
          {imageProviderLabel(image.provider, image.model, t)}
        </span>
        {!failed && (
          <a
            href={src}
            download={`logo-${promptId}-${index + 1}.png`}
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-zinc-200 shrink-0"
          >
            <Download size={14} />
          </a>
        )}
      </div>
      <div className="px-2 pb-2">{children}</div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Copy, Check, ImageIcon, Loader2, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import type { ComposedPrompt } from '../types';
import { ScoreBar } from './ScoreBar';
import { BriefCoverageMap } from './brief/BriefCoverageMap';
import { useAppStore, useIsGenerating, usePromptImages } from '../store';
import { generatePromptLogo, submitPromptFeedback } from '../api';
import { parseLogoMarkType, parseTypographyStyle } from '../lib/brief-mappers';

const MAX_LOGOS = 3;

interface PromptCardProps {
  prompt: ComposedPrompt;
  selected: boolean;
  onSelect: () => void;
  rank?: number;
  standalone?: boolean;
  onStateChange?: () => void;
}

export function PromptCard({
  prompt,
  selected,
  onSelect,
  rank,
  standalone = false,
  onStateChange,
}: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const companyName = useAppStore((s) => s.companyName);
  const designBrief = useAppStore((s) => s.designBrief);
  const setGenerating = useAppStore((s) => s.setGenerating);
  const setPromptLogos = useAppStore((s) => s.setPromptLogos);
  const setPromptFeedback = useAppStore((s) => s.setPromptFeedback);

  const storeLogos = usePromptImages(prompt.id);
  const logos = standalone ? (prompt.logos ?? []) : (prompt.logos ?? storeLogos);
  const isGenerating = useIsGenerating(prompt.id);
  const atLogoLimit = logos.length >= MAX_LOGOS;
  const feedback = prompt.feedback ?? null;

  const submitFeedback = useMutation({
    mutationFn: (signalType: 'LIKE' | 'DISLIKE') => submitPromptFeedback(prompt.id, signalType),
    onSuccess: (result) => {
      if (standalone) {
        onStateChange?.();
      } else {
        setPromptFeedback(prompt.id, result.feedback);
      }
    },
  });

  const copy = async () => {
    await navigator.clipboard.writeText(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (atLogoLimit) return;
    setGenerating(prompt.id);
    try {
      const brandName = companyName.trim() || undefined;
      const rawMarkType =
        designBrief.markType || prompt.metadata?.markType || undefined;
      const rawTypographyStyle =
        designBrief.typographyStyle || prompt.metadata?.typographyStyle || undefined;

      const result = await generatePromptLogo(prompt.id, {
        companyName: brandName,
        markType: parseLogoMarkType(rawMarkType, brandName),
        typographyStyle: brandName
          ? parseTypographyStyle(rawTypographyStyle)
          : undefined,
      });
      if (standalone) {
        onStateChange?.();
      } else {
        setPromptLogos(prompt.id, result.logos);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setGenerating(null);
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
            Q {prompt.scores.promptQuality.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-500">{prompt.metadata?.era}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copy();
          }}
          title="Copy prompt"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {logos.length > 0 && (
        <div
          className={clsx(
            'mb-4 grid gap-2',
            logos.length === 1 ? 'grid-cols-1' : logos.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {logos.map((image, index) => (
            <div
              key={image.id}
              className="rounded-lg overflow-hidden border border-zinc-800 bg-white"
            >
              <img
                src={image.url}
                alt={`Generated logo ${index + 1}`}
                className="w-full aspect-square object-contain bg-white"
              />
              <div className="px-2 py-1.5 flex items-center justify-between border-t border-zinc-800 bg-zinc-950">
                <span className="text-[9px] text-zinc-500 uppercase tracking-wide truncate">
                  {image.provider === 'openai' ? image.model ?? 'OpenAI' : 'Mock'}
                </span>
                <a
                  href={image.url}
                  download={`logo-${prompt.id}-${index + 1}.png`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-zinc-400 hover:text-zinc-200 shrink-0"
                >
                  <Download size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-sm leading-relaxed text-zinc-300 mb-4 whitespace-pre-wrap break-words">
        {prompt.text}
      </p>

      <button
        type="button"
        onClick={generateImage}
        disabled={isGenerating || atLogoLimit}
        className="mb-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
        {isGenerating
          ? 'Generating…'
          : atLogoLimit
            ? `Maximum ${MAX_LOGOS} logos`
            : `Generate Logo Image (${logos.length}/${MAX_LOGOS})`}
      </button>

      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 pt-3 border-t border-zinc-800"
        >
          <ScoreBar label="Modernism" value={prompt.scores.modernismScore} />
          <ScoreBar label="Swiss" value={prompt.scores.swissScore} />
          <ScoreBar label="Minimalism" value={prompt.scores.minimalismScore} />
          <ScoreBar label="Geometry" value={prompt.scores.geometryScore} />
          {prompt.metadata.briefCoverage && prompt.metadata.briefCoverage.length > 0 && (
            <BriefCoverageMap
              designBrief={designBrief}
              promptCoverage={prompt.metadata.briefCoverage}
              compact
            />
          )}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {prompt.selectedPrinciples.slice(0, 8).map((p) => (
              <span
                key={p.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
              >
                {p.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div
        className="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Feedback</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitFeedback.isPending}
            onClick={() => submitFeedback.mutate('LIKE')}
            title="Like"
            className={clsx(
              'p-1.5 rounded-lg transition-colors disabled:opacity-50',
              feedback === 'LIKE'
                ? 'bg-emerald-900/50 text-emerald-300'
                : 'bg-zinc-800 text-zinc-400 hover:text-emerald-300',
            )}
          >
            {submitFeedback.isPending && submitFeedback.variables === 'LIKE' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ThumbsUp size={14} />
            )}
          </button>
          <button
            type="button"
            disabled={submitFeedback.isPending}
            onClick={() => submitFeedback.mutate('DISLIKE')}
            title="Dislike"
            className={clsx(
              'p-1.5 rounded-lg transition-colors disabled:opacity-50',
              feedback === 'DISLIKE'
                ? 'bg-red-900/40 text-red-300'
                : 'bg-zinc-800 text-zinc-400 hover:text-red-300',
            )}
          >
            {submitFeedback.isPending && submitFeedback.variables === 'DISLIKE' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ThumbsDown size={14} />
            )}
          </button>
        </div>
      </div>
      {submitFeedback.isError && (
        <p className="text-[10px] text-red-400 mt-1">Failed to save feedback</p>
      )}
    </article>
  );
}

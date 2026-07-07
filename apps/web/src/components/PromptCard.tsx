import { motion } from 'framer-motion';
import { Copy, Check, ImageIcon, Loader2, Download } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import type { ComposedPrompt } from '../types';
import { ScoreBar } from './ScoreBar';
import { useAppStore, useIsGenerating, usePromptImages } from '../store';
import { generateImageFromPrompt } from '../api';

interface PromptCardProps {
  prompt: ComposedPrompt;
  selected: boolean;
  onSelect: () => void;
  rank?: number;
}

export function PromptCard({ prompt, selected, onSelect, rank }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const companyName = useAppStore((s) => s.companyName);
  const industry = useAppStore((s) => s.industry);
  const setGenerating = useAppStore((s) => s.setGenerating);
  const setGeneratedImages = useAppStore((s) => s.setGeneratedImages);

  const images = usePromptImages(prompt.id);
  const isGenerating = useIsGenerating(prompt.id);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGenerating(prompt.id);
    try {
      const result = await generateImageFromPrompt({
        text: prompt.text,
        companyName: companyName || undefined,
        industry,
      });
      setGeneratedImages(prompt.id, result.images);
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
          <span className="text-xs text-zinc-500">{prompt.metadata.era}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={generateImage}
            disabled={isGenerating}
            title="Generate logo image"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copy();
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mb-4 rounded-lg overflow-hidden border border-zinc-800 bg-white">
          <img
            src={images[0].url}
            alt="Generated logo"
            className="w-full aspect-square object-contain bg-white"
          />
          <div className="px-3 py-2 flex items-center justify-between border-t border-zinc-800 bg-zinc-950">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
              {images[0].provider === 'openai'
                ? images[0].model ?? 'OpenAI'
                : 'Mock preview'}
            </span>
            <a
              href={images[0].url}
              download={`logo-${prompt.id}.png`}
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <Download size={14} />
            </a>
          </div>
        </div>
      )}

      <p className="font-mono text-sm leading-relaxed text-zinc-300 mb-4">{prompt.text}</p>

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
          <button
            type="button"
            onClick={generateImage}
            disabled={isGenerating}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            {isGenerating ? 'Generating…' : 'Generate Logo Image'}
          </button>
        </motion.div>
      )}
    </article>
  );
}

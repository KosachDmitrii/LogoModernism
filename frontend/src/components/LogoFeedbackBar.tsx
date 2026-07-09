import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Loader2, Star } from 'lucide-react';
import type { GeneratedImage, LogoFeedback } from '../types';
import { submitLogoFeedback } from '../api';
import {
  LOGO_MISSED_TAGS,
  LOGO_WORKED_TAGS,
  scoreToStars,
  starsToScore,
} from '../lib/logo-feedback';

interface LogoFeedbackBarProps {
  promptId: string;
  logo: GeneratedImage;
  onUpdated?: (feedback: LogoFeedback) => void;
}

function toggleTag(tags: string[], tag: string, max = 3): string[] {
  if (tags.includes(tag)) return tags.filter((t) => t !== tag);
  if (tags.length >= max) return tags;
  return [...tags, tag];
}

const tagButtonClass = (active: boolean) =>
  clsx(
    'px-2 py-0.5 rounded-lg text-[9px] border transition-colors',
    active
      ? 'border-zinc-500 bg-zinc-800 text-zinc-200'
      : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
  );

export function LogoFeedbackBar({ promptId, logo, onUpdated }: LogoFeedbackBarProps) {
  const existing = logo.feedback;
  const [workedTags, setWorkedTags] = useState<string[]>(existing?.workedTags ?? []);
  const [missedTags, setMissedTags] = useState<string[]>(existing?.missedTags ?? []);
  const selectedStars = existing ? scoreToStars(existing.score) : 0;

  const submit = useMutation({
    mutationFn: (body: { score: number; emoji: string; workedTags?: string[]; missedTags?: string[] }) =>
      submitLogoFeedback(promptId, logo.id, body),
    onSuccess: (result) => {
      if (result.feedback) onUpdated?.(result.feedback);
    },
  });

  const handleRate = (stars: number) => {
    const level = starsToScore(stars);
    submit.mutate({
      score: level.score,
      emoji: `${stars}/5`,
      workedTags: workedTags.length ? workedTags : undefined,
      missedTags: missedTags.length ? missedTags : undefined,
    });
  };

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Feedback</span>
        <div className="flex items-center gap-1">
          {submit.isPending && <Loader2 size={12} className="animate-spin text-zinc-500 mr-1" />}
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              title={starsToScore(stars).label}
              disabled={submit.isPending}
              onClick={() => handleRate(stars)}
              className={clsx(
                'p-1 rounded-lg transition-colors disabled:opacity-50',
                selectedStars >= stars
                  ? 'text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-400',
              )}
            >
              <Star
                size={13}
                className={clsx(selectedStars >= stars && 'fill-current')}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wide shrink-0">Worked</span>
          <div className="flex flex-wrap gap-1">
            {LOGO_WORKED_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setWorkedTags((prev) => toggleTag(prev, tag))}
                className={tagButtonClass(workedTags.includes(tag))}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wide shrink-0">Missed</span>
          <div className="flex flex-wrap gap-1">
            {LOGO_MISSED_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setMissedTags((prev) => toggleTag(prev, tag))}
                className={tagButtonClass(missedTags.includes(tag))}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

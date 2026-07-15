import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { GeneratedImage, LogoFeedback } from '../types';
import { submitLogoFeedback, submitLogoTags } from '../api';
import {
  LOGO_MISSED_TAGS,
  LOGO_MISSED_TAG_KEYS,
  LOGO_WORKED_TAGS,
  LOGO_WORKED_TAG_KEYS,
  scoreToStars,
  starsToScore,
} from '../lib/logo-feedback';
import { useT } from '../i18n';
import { formatError } from '../lib/api-error';
import { useToast } from './ToastProvider';
import { Tooltip } from './ui/Tooltip';

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

const tagButtonClass = (active: boolean, saving: boolean) =>
  clsx(
    'px-2 py-0.5 rounded-lg text-[11px] border transition-colors',
    saving && 'opacity-60',
    active
      ? 'border-zinc-400 bg-zinc-700 text-zinc-100'
      : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
  );

export function LogoFeedbackBar({ promptId, logo, onUpdated }: LogoFeedbackBarProps) {
  const t = useT();
  const toast = useToast();
  const existing = logo.feedback;
  const [workedTags, setWorkedTags] = useState<string[]>(existing?.workedTags ?? []);
  const [missedTags, setMissedTags] = useState<string[]>(existing?.missedTags ?? []);
  const [savingTag, setSavingTag] = useState<string | null>(null);
  const [selectedStars, setSelectedStars] = useState(() => scoreToStars(existing?.score));

  useEffect(() => {
    setWorkedTags(existing?.workedTags ?? []);
    setMissedTags(existing?.missedTags ?? []);
    setSelectedStars(scoreToStars(existing?.score));
  }, [logo.id, existing?.score, existing?.tagsUpdatedAt, existing?.submittedAt]);

  const onSaved = (result: { feedback?: LogoFeedback }) => {
    if (result.feedback) onUpdated?.(result.feedback);
  };

  const rateLogo = useMutation({
    mutationFn: (body: { score: number; emoji: string }) =>
      submitLogoFeedback(promptId, logo.id, body),
    onMutate: (body) => {
      const previousStars = selectedStars;
      setSelectedStars(scoreToStars(body.score));
      return { previousStars };
    },
    onSuccess: (result) => {
      onSaved(result);
      toast.success(t('toast.feedbackSaved'));
    },
    onError: (error, _body, context) => {
      setSelectedStars(context?.previousStars ?? scoreToStars(existing?.score));
      toast.error(formatError(error, t));
    },
  });

  const saveTags = useMutation({
    mutationFn: (body: { workedTags?: string[]; missedTags?: string[] }) =>
      submitLogoTags(promptId, logo.id, body),
    onSuccess: onSaved,
    onError: (error) => {
      setWorkedTags(existing?.workedTags ?? []);
      setMissedTags(existing?.missedTags ?? []);
      toast.error(formatError(error, t));
    },
  });

  const handleRate = (stars: number) => {
    if (rateLogo.isPending) return;
    const level = starsToScore(stars);
    rateLogo.mutate({ score: level.score, emoji: `${stars}/5` });
  };

  const persistTags = (nextWorked: string[], nextMissed: string[], clickedTag: string) => {
    setSavingTag(clickedTag);
    saveTags.mutate(
      {
        workedTags: nextWorked.length ? nextWorked : undefined,
        missedTags: nextMissed.length ? nextMissed : undefined,
      },
      { onSettled: () => setSavingTag(null) },
    );
  };

  const handleWorkedTag = (tag: string) => {
    const next = toggleTag(workedTags, tag);
    setWorkedTags(next);
    persistTags(next, missedTags, tag);
  };

  const handleMissedTag = (tag: string) => {
    const next = toggleTag(missedTags, tag);
    setMissedTags(next);
    persistTags(workedTags, next, tag);
  };

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{t('feedback.title')}</span>
        <ToggleGroup
          value={selectedStars ? [String(selectedStars)] : []}
          onValueChange={(values) => {
            const stars = Number(values[0]);
            if (stars) handleRate(stars);
          }}
          disabled={rateLogo.isPending}
          aria-label={t('feedback.title')}
          className="flex items-center gap-0"
        >
          {[1, 2, 3, 4, 5].map((stars) => {
            const filled = selectedStars >= stars;
            return (
              <Tooltip key={stars} content={t(starsToScore(stars).labelKey)}>
              <Toggle
                value={String(stars)}
                aria-label={t(starsToScore(stars).labelKey)}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={clsx(
                  'p-1 rounded-lg transition-colors duration-100',
                  rateLogo.isPending ? 'cursor-wait' : 'hover:text-zinc-400',
                  filled ? 'text-zinc-200' : 'text-zinc-600',
                )}
              >
                <Star size={15} className={clsx(filled && 'fill-current')} />
              </Toggle>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-600 uppercase tracking-wide shrink-0">
            {t('feedback.worked')}
          </span>
          <ToggleGroup
            multiple
            value={workedTags}
            onValueChange={(values) => {
              const clicked = values.find((tag) => !workedTags.includes(tag))
                ?? workedTags.find((tag) => !values.includes(tag));
              if (clicked) handleWorkedTag(clicked);
            }}
            className="flex flex-wrap gap-1"
          >
            {LOGO_WORKED_TAGS.map((tag) => (
              <Toggle
                key={tag}
                value={tag}
                disabled={savingTag === tag}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={tagButtonClass(workedTags.includes(tag), savingTag === tag)}
              >
                {t(LOGO_WORKED_TAG_KEYS[tag])}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-600 uppercase tracking-wide shrink-0">
            {t('feedback.missed')}
          </span>
          <ToggleGroup
            multiple
            value={missedTags}
            onValueChange={(values) => {
              const clicked = values.find((tag) => !missedTags.includes(tag))
                ?? missedTags.find((tag) => !values.includes(tag));
              if (clicked) handleMissedTag(clicked);
            }}
            className="flex flex-wrap gap-1"
          >
            {LOGO_MISSED_TAGS.map((tag) => (
              <Toggle
                key={tag}
                value={tag}
                disabled={savingTag === tag}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={tagButtonClass(missedTags.includes(tag), savingTag === tag)}
              >
                {t(LOGO_MISSED_TAG_KEYS[tag])}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { useAppStore } from '../../store';
import { runBriefInterview } from '../../api';
import type { BriefInterviewResponse, DesignBrief } from '../../types';
import { designBriefToBriefContext, parseMarkTypeFromBrief } from '../../lib/brief-mappers';
import { useT } from '../../i18n';
import { formatError } from '../../lib/api-error';
import { useToast } from '../ToastProvider';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function BriefAnalyzeSection() {
  const t = useT();
  const toast = useToast();
  const industry = useAppStore((s) => s.industry);
  const companyName = useAppStore((s) => s.companyName);
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const [result, setResult] = useState<BriefInterviewResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const interview = useMutation({
    mutationFn: () =>
      runBriefInterview({
        industry: industry.trim() || 'general',
        companyName: companyName.trim() || undefined,
        markType: parseMarkTypeFromBrief(designBrief),
        briefContext: designBriefToBriefContext(designBrief),
      }),
    onSuccess: (data) => {
      setResult(data);
      setAnswers({});
      const sources = designBrief.sources.includes('Brain interview')
        ? designBrief.sources
        : [...designBrief.sources, 'Brain interview'];
      updateDesignBrief({ sources });
    },
    onError: (error) => toast.error(formatError(error, t)),
  });

  const applyAnswer = (questionId: string, field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (field === 'clientNotes') {
      const existing = designBrief.clientNotes?.trim() ?? '';
      updateDesignBrief({
        clientNotes: existing ? `${existing}. ${value}` : value,
      });
      return;
    }
    if (field === 'geometry') {
      updateDesignBrief({ geometry: value });
      return;
    }
    if (field === 'markType') {
      updateDesignBrief({ markType: value as DesignBrief['markType'] });
      return;
    }
    if (field === 'colorPalette') {
      updateDesignBrief({ colorPalette: value as DesignBrief['colorPalette'] });
      return;
    }
    if (field === 'constraints') {
      updateDesignBrief({ constraints: value });
      return;
    }
    if (field in designBrief) {
      updateDesignBrief({ [field]: value } as Partial<typeof designBrief>);
    }
  };

  const canAnalyze = Boolean(industry.trim());

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-zinc-500 leading-relaxed flex items-start gap-1.5">
        <MessageCircleQuestion size={11} className="shrink-0 mt-0.5" />
        {t('brief.analyze.intro')}
      </p>

      <Button
        type="button"
        disabled={!canAnalyze || interview.isPending}
        onClick={() => interview.mutate()}
        className="w-full px-3 py-2 rounded-lg bg-violet-900/50 hover:bg-violet-900/70 border border-violet-800/50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {interview.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        {t('brief.analyze.button')}
      </Button>

      {!canAnalyze && (
        <p className="text-xs text-amber-300/80">{t('brief.typography.setIndustryFirst')}</p>
      )}

      {result && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t('brief.analyze.readiness')}</span>
            <span
              className={clsx(
                'font-mono',
                result.readinessScore >= 80
                  ? 'text-emerald-400'
                  : result.readinessScore >= 50
                    ? 'text-amber-400'
                    : 'text-zinc-400',
              )}
            >
              {result.readinessScore}%
            </span>
          </div>
          <p className="text-xs text-zinc-400">{result.summary}</p>

          {result.clientIntent && (
            <div className="text-xs text-zinc-500 space-y-0.5 pt-1 border-t border-zinc-800">
              <p>
                <span className="text-zinc-400">{t('brief.analyze.abstraction')}</span>{' '}
                {result.clientIntent.abstractionLevel}
              </p>
              {result.clientIntent.desiredMotifs.length > 0 && (
                <p>
                  <span className="text-emerald-500/80">+</span>{' '}
                  {result.clientIntent.desiredMotifs.slice(0, 4).join(', ')}
                </p>
              )}
              {result.clientIntent.forbiddenMotifs.length > 0 && (
                <p>
                  <span className="text-red-400/80">−</span>{' '}
                  {result.clientIntent.forbiddenMotifs.slice(0, 4).join(', ')}
                </p>
              )}
            </div>
          )}

          {result.questions.length === 0 ? (
            <p className="text-xs text-emerald-400 pt-1">{t('brief.analyze.complete')}</p>
          ) : (
            <ul className="space-y-2 pt-1">
              {result.questions.map((q) => (
                <li key={q.id} className="space-y-1">
                  <p className="text-[13px] text-zinc-300">{q.prompt}</p>
                  <p className="text-[11px] text-zinc-600">{q.why}</p>
                  {q.options ? (
                    <ToggleGroup
                      value={answers[q.id] ? [answers[q.id]] : []}
                      onValueChange={(values) => {
                        const value = values[0];
                        if (value) applyAnswer(q.id, q.field, value);
                      }}
                      aria-label={q.prompt}
                      className="flex flex-wrap gap-1"
                    >
                      {q.options.map((opt) => (
                        <Toggle
                          key={opt}
                          value={opt}
                          className={clsx(
                            'px-2 py-0.5 rounded text-[11px] border transition-colors',
                            answers[q.id] === opt
                              ? 'border-zinc-500 bg-zinc-800 text-zinc-200'
                              : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
                          )}
                        >
                          {opt.replace(/_/g, ' ')}
                        </Toggle>
                      ))}
                    </ToggleGroup>
                  ) : (
                    <Input
                      type="text"
                      placeholder={t('common.yourAnswer')}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => applyAnswer(q.id, q.field, e.target.value)}
                      className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

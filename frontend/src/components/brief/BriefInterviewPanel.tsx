import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { runBriefInterview } from '../../api';
import type { BriefInterviewResponse } from '../../types';
import { designBriefToBriefContext, parseMarkTypeFromBrief } from '../../lib/brief-mappers';
import { useT } from '../../i18n';
import { formatError } from '../../lib/api-error';
import { useToast } from '../ToastProvider';

export function BriefInterviewPanel() {
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
    if (field in designBrief) {
      updateDesignBrief({ [field]: value } as Partial<typeof designBrief>);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <MessageCircleQuestion size={16} />
            {t('brief.interview.title')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{t('brief.analyze.intro')}</p>
        </div>
        <button
          type="button"
          onClick={() => interview.mutate()}
          disabled={interview.isPending || !industry.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs hover:bg-zinc-700 disabled:opacity-50"
        >
          {interview.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {t('brief.analyze.button')}
        </button>
      </div>

      {result && (
        <div className="space-y-3 pt-2 border-t border-zinc-800">
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
          <p className="text-xs text-zinc-400 leading-relaxed">{result.summary}</p>

          {result.clientIntent && (
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-500 space-y-1">
              <p>
                <span className="text-zinc-400">{t('brief.analyze.abstraction')}:</span>{' '}
                {result.clientIntent.abstractionLevel}
              </p>
              {result.clientIntent.desiredMotifs.length > 0 && (
                <p>
                  <span className="text-zinc-400">{t('brief.analyze.desired')}:</span>{' '}
                  {result.clientIntent.desiredMotifs.join(', ')}
                </p>
              )}
              {result.clientIntent.forbiddenMotifs.length > 0 && (
                <p>
                  <span className="text-zinc-400">{t('brief.analyze.forbidden')}:</span>{' '}
                  {result.clientIntent.forbiddenMotifs.join(', ')}
                </p>
              )}
            </div>
          )}

          {result.questions.length === 0 ? (
            <p className="text-xs text-emerald-400">{t('brief.analyze.complete')}</p>
          ) : (
            <ul className="space-y-3">
              {result.questions.map((q) => (
                <li key={q.id} className="space-y-1.5">
                  <p className="text-xs text-zinc-300">{q.prompt}</p>
                  <p className="text-[11px] text-zinc-600">{q.why}</p>
                  {q.options ? (
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => applyAnswer(q.id, q.field, opt)}
                          className={clsx(
                            'px-2 py-1 rounded text-xs border transition-colors',
                            answers[q.id] === opt
                              ? 'border-zinc-500 bg-zinc-800 text-zinc-200'
                              : 'border-zinc-800 text-zinc-500 hover:border-zinc-700',
                          )}
                        >
                          {opt.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={t('common.yourAnswer')}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => applyAnswer(q.id, q.field, e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 placeholder:text-zinc-600"
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

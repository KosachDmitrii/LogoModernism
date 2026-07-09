import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { runBriefInterview } from '../../api';
import type { BriefInterviewResponse } from '../../types';
import { designBriefToBriefContext, parseMarkTypeFromBrief } from '../../lib/brief-mappers';

export function BriefInterviewPanel() {
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
            <MessageCircleQuestion size={14} />
            Brain Brief Interview
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Design Brain asks targeted questions — only explicit client forbids go to Avoid.
          </p>
        </div>
        <button
          type="button"
          onClick={() => interview.mutate()}
          disabled={interview.isPending || !industry.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs hover:bg-zinc-700 disabled:opacity-50"
        >
          {interview.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Analyze brief
        </button>
      </div>

      {interview.isError && (
        <p className="text-[10px] text-red-400">
          {interview.error instanceof Error ? interview.error.message : 'Interview failed'}
        </p>
      )}

      {result && (
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">Readiness</span>
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
          <p className="text-[10px] text-zinc-400 leading-relaxed">{result.summary}</p>

          {result.clientIntent && (
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-500 space-y-1">
              <p>
                <span className="text-zinc-400">Abstraction:</span>{' '}
                {result.clientIntent.abstractionLevel}
              </p>
              {result.clientIntent.desiredMotifs.length > 0 && (
                <p>
                  <span className="text-zinc-400">Desired:</span>{' '}
                  {result.clientIntent.desiredMotifs.join(', ')}
                </p>
              )}
              {result.clientIntent.forbiddenMotifs.length > 0 && (
                <p>
                  <span className="text-zinc-400">Forbidden:</span>{' '}
                  {result.clientIntent.forbiddenMotifs.join(', ')}
                </p>
              )}
            </div>
          )}

          {result.questions.length === 0 ? (
            <p className="text-[10px] text-emerald-400">Brief is complete — ready for generation.</p>
          ) : (
            <ul className="space-y-3">
              {result.questions.map((q) => (
                <li key={q.id} className="space-y-1.5">
                  <p className="text-xs text-zinc-300">{q.prompt}</p>
                  <p className="text-[9px] text-zinc-600">{q.why}</p>
                  {q.options ? (
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => applyAnswer(q.id, q.field, opt)}
                          className={clsx(
                            'px-2 py-1 rounded text-[10px] border transition-colors',
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
                      placeholder="Your answer…"
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

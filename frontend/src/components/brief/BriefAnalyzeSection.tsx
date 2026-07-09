import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { runBriefInterview } from '../../api';
import type { BriefInterviewResponse } from '../../types';
import { designBriefToBriefContext, parseMarkTypeFromBrief } from '../../lib/brief-mappers';

export function BriefAnalyzeSection() {
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
    if (field in designBrief) {
      updateDesignBrief({ [field]: value } as Partial<typeof designBrief>);
    }
  };

  const canAnalyze = Boolean(industry.trim());

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] text-zinc-500 leading-relaxed flex items-start gap-1.5">
        <MessageCircleQuestion size={11} className="shrink-0 mt-0.5" />
        Brain reads the whole brief, finds gaps, and asks only what is missing — explicit forbids go to
        Avoid.
      </p>

      <button
        type="button"
        disabled={!canAnalyze || interview.isPending}
        onClick={() => interview.mutate()}
        className="w-full px-3 py-2 rounded-lg bg-violet-900/50 hover:bg-violet-900/70 border border-violet-800/50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {interview.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        Analyze brief
      </button>

      {!canAnalyze && (
        <p className="text-[10px] text-amber-300/80">Set industry on the Project step first.</p>
      )}

      {interview.isError && (
        <p className="text-[10px] text-red-400">
          {interview.error instanceof Error ? interview.error.message : 'Analyze brief failed'}
        </p>
      )}

      {result && (
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
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
          <p className="text-[10px] text-zinc-400">{result.summary}</p>

          {result.clientIntent && (
            <div className="text-[10px] text-zinc-500 space-y-0.5 pt-1 border-t border-zinc-800">
              <p>
                <span className="text-zinc-400">Abstraction:</span>{' '}
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
            <p className="text-[10px] text-emerald-400 pt-1">Brief is complete — ready to generate.</p>
          ) : (
            <ul className="space-y-2 pt-1">
              {result.questions.map((q) => (
                <li key={q.id} className="space-y-1">
                  <p className="text-[11px] text-zinc-300">{q.prompt}</p>
                  <p className="text-[9px] text-zinc-600">{q.why}</p>
                  {q.options ? (
                    <div className="flex flex-wrap gap-1">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => applyAnswer(q.id, q.field, opt)}
                          className={clsx(
                            'px-2 py-0.5 rounded text-[9px] border transition-colors',
                            answers[q.id] === opt
                              ? 'border-zinc-500 bg-zinc-800 text-zinc-200'
                              : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
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
                      className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300"
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

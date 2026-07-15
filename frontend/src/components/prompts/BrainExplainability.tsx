import { Brain } from 'lucide-react';
import type { ComposedPrompt } from '../../types';
import { useT } from '../../i18n';
import { Tooltip } from '../ui/Tooltip';

interface BrainExplainabilityProps {
  prompt: ComposedPrompt;
}

export function BrainExplainability({ prompt }: BrainExplainabilityProps) {
  const t = useT();
  const arch = prompt.metadata?.brainArchitecture;
  if (!arch) return null;

  const { clientIntent, designStrategy, agentContributions } = arch;

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-800">
      <p className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
        <Brain size={11} />
        {t('prompts.card.designBrain')}
      </p>

      {clientIntent && (
        <div className="text-xs text-zinc-500 space-y-0.5">
          <p>
            <span className="text-zinc-400">{t('prompts.explain.intent')}:</span>{' '}
            {clientIntent.abstractionLevel} · {clientIntent.industryDomain}
          </p>
          {clientIntent.desiredMotifs.length > 0 && (
            <p>
              <span className="text-emerald-500/80">+</span> {clientIntent.desiredMotifs.slice(0, 3).join(', ')}
            </p>
          )}
          {clientIntent.forbiddenMotifs.length > 0 && (
            <p>
              <span className="text-red-400/80">−</span> {clientIntent.forbiddenMotifs.slice(0, 4).join(', ')}
            </p>
          )}
        </div>
      )}

      {designStrategy && (
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="text-zinc-400">{t('prompts.explain.strategy')}:</span> {designStrategy.symbolLogic}
        </p>
      )}

      {agentContributions && agentContributions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agentContributions.map((agent) => (
            <Tooltip key={agent.role} content={agent.summary}>
              <span
                tabIndex={0}
                className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 capitalize"
              >
                {agent.role.replace('-', ' ')}
              </span>
            </Tooltip>
          ))}
        </div>
      )}

      {arch.projectMemorySummary && (
        <p className="text-[11px] text-zinc-600 italic">{arch.projectMemorySummary}</p>
      )}

      {prompt.metadata?.reasoning && (
        <p className="text-[11px] text-zinc-600 leading-relaxed">{prompt.metadata.reasoning}</p>
      )}
    </div>
  );
}

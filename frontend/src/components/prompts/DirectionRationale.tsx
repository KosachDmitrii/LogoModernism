import type { ComposedPrompt } from '../../types';
import { useT } from '../../i18n';

interface DirectionRationaleProps {
  prompt: ComposedPrompt;
}

/** Always-visible “why this direction works” strip — Brain value without expanding the card. */
export function DirectionRationale({ prompt }: DirectionRationaleProps) {
  const t = useT();
  const principles = (prompt.selectedPrinciples ?? []).slice(0, 5);
  const territory = prompt.metadata?.creativeTerritory?.name;
  const why =
    prompt.metadata?.reasoning?.trim() ||
    prompt.metadata?.brainArchitecture?.designStrategy?.symbolLogic?.trim() ||
    '';
  const critique = prompt.metadata?.partnerCritique;

  if (!territory && principles.length === 0 && !why && !critique) return null;

  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{t('prompts.rationale.title')}</p>
      {territory && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">{t('prompts.rationale.territory')}: </span>
          {territory}
        </p>
      )}
      {why && <p className="text-xs leading-relaxed text-zinc-400">{why}</p>}
      {critique && (
        <p className="text-[11px] text-zinc-500">
          {t('prompts.rationale.critique', { score: critique.overallScore.toFixed(1) })}
        </p>
      )}
      {principles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {principles.map((principle) => (
            <span
              key={principle.id}
              className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400"
            >
              {principle.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

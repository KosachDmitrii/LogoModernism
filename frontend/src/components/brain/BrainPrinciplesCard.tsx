import type { ReactNode } from 'react';
import { Progress } from '@base-ui/react/progress';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { LearnedPrincipleRecord } from '../../types';
import { useT, type MessageKey } from '../../i18n';
import {
  formatBrainLabel,
  getPrincipleInfluenceLevel,
  PRINCIPLE_MAX_WEIGHT,
  type PrincipleInfluenceLevel,
} from '../../lib/brain-labels';
import { resolveCitationLink } from '../../lib/citation-url';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';

const INFLUENCE_LABEL_KEYS: Record<PrincipleInfluenceLevel, MessageKey> = {
  weak: 'brain.principleInfluence.weak',
  moderate: 'brain.principleInfluence.moderate',
  strong: 'brain.principleInfluence.strong',
  veryStrong: 'brain.principleInfluence.veryStrong',
};

interface BrainPrinciplesCardProps {
  principles: LearnedPrincipleRecord[];
  /** When set, only the first N principles are shown. Omit to show all. */
  limit?: number;
  /** Total count for badge when list is paginated. */
  totalCount?: number;
  /** Added to row rank for paginated lists (e.g. page 2 starts at 101). */
  rankOffset?: number;
  titleKey?: MessageKey;
  hintKey?: MessageKey;
  onViewAll?: () => void;
  footer?: ReactNode;
}

export function BrainPrinciplesCard({
  principles,
  limit,
  totalCount,
  rankOffset = 0,
  titleKey = 'brain.topPrinciples',
  hintKey = 'brain.topPrinciplesHint',
  onViewAll,
  footer,
}: BrainPrinciplesCardProps) {
  const t = useT();
  const visible = limit ? principles.slice(0, limit) : principles;
  const hasMore = limit != null && (totalCount ?? principles.length) > limit;
  const badgeCount = totalCount ?? (limit ? undefined : principles.length);

  if (visible.length === 0) return null;

  return (
    <section className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={16} className="text-violet-400 shrink-0" />
            <h2 className="text-sm font-medium text-zinc-200">{t(titleKey)}</h2>
            {badgeCount != null && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                {badgeCount}
              </span>
            )}
          </div>
          {onViewAll && hasMore && (
            <Button
              type="button"
              onClick={onViewAll}
              className="text-xs text-violet-400 hover:text-violet-300 shrink-0"
            >
              {t('brain.principlesViewAll')}
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">{t(hintKey)}</p>
      </div>

      <ol className="space-y-3" role="list">
        {visible.map((principle, index) => (
          <PrincipleRow
            key={principle.id}
            principle={principle}
            rank={rankOffset + index + 1}
          />
        ))}
      </ol>

      {footer}
    </section>
  );
}

function PrincipleRow({ principle, rank }: { principle: LearnedPrincipleRecord; rank: number }) {
  const t = useT();
  const citation = principle.citations?.[0];
  const citationLink = citation?.url ? resolveCitationLink(citation.url) : null;
  const influenceLevel = getPrincipleInfluenceLevel(principle.weight);
  const influenceLabel = t(INFLUENCE_LABEL_KEYS[influenceLevel]);
  const weightDetail = t('brain.principleWeightDetail', {
    weight: principle.weight.toFixed(1),
    max: PRINCIPLE_MAX_WEIGHT,
  });
  const influencePercent = Math.min(
    100,
    Math.max(8, (principle.weight / PRINCIPLE_MAX_WEIGHT) * 100),
  );

  return (
    <li className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
      <div className="flex items-start gap-3">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-900/40 text-[11px] font-medium text-violet-200"
          aria-hidden
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {formatBrainLabel(principle.category)}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-100">{principle.promptFragment}</p>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{principle.ruleText}</p>
          </div>

          {citation ? (
            <figure className="pl-3 border-l-2 border-zinc-700/80">
              <blockquote className="text-xs text-zinc-500 italic leading-relaxed">
                “{citation.quote}”
              </blockquote>
              {citationLink?.href ? (
                <figcaption className="mt-1.5">
                  <Tooltip content={citationLink.href}>
                    <a
                      href={citationLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                    >
                      {t('brain.principleSource')}
                      <ExternalLink size={11} />
                    </a>
                  </Tooltip>
                </figcaption>
              ) : citationLink?.kind === 'pdf' ? (
                <figcaption className="mt-1.5 text-[11px] text-zinc-500">
                  {t('brain.principleSourcePdf', { title: citationLink.label })}
                </figcaption>
              ) : citationLink?.label ? (
                <figcaption className="mt-1.5 text-[11px] text-zinc-600">
                  {t('brain.principleSourceUnavailable')}
                </figcaption>
              ) : null}
            </figure>
          ) : (
            <p className="text-[11px] text-zinc-600">{t('brain.principleNoCitation')}</p>
          )}

          <div className="pt-1">
            <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
              <span>{t('brain.principleInfluence')}</span>
              <Tooltip content={weightDetail}>
                <span tabIndex={0} className="text-zinc-300 font-medium cursor-help">
                  {influenceLabel}
                </span>
              </Tooltip>
            </div>
            <Progress.Root
              value={principle.weight}
              min={0}
              max={PRINCIPLE_MAX_WEIGHT}
              className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden"
              aria-label={`${influenceLabel} (${weightDetail})`}
            >
              <Progress.Indicator
                className="h-full rounded-full bg-violet-500/80"
                style={{ width: `${influencePercent}%` }}
              />
            </Progress.Root>
          </div>
        </div>
      </div>
    </li>
  );
}

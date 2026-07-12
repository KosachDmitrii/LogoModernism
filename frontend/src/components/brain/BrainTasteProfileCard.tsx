import { Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { TasteProfile } from '../../types';
import { useT } from '../../i18n';
import { formatBrainLabel } from '../../lib/brain-labels';

interface BrainTasteProfileCardProps {
  taste: TasteProfile;
}

export function BrainTasteProfileCard({ taste }: BrainTasteProfileCardProps) {
  const t = useT();
  const scorePercent = Math.min(100, Math.max(0, (taste.averageScore / 10) * 100));

  const sections = [
    {
      id: 'markTypes',
      label: t('brain.taste.markTypes'),
      items: taste.preferredMarkTypes,
      tone: 'positive' as const,
    },
    {
      id: 'geometry',
      label: t('brain.taste.geometry'),
      items: taste.preferredGeometry,
      tone: 'positive' as const,
    },
    {
      id: 'colors',
      label: t('brain.taste.colors'),
      items: taste.preferredColors ?? [],
      tone: 'neutral' as const,
    },
    {
      id: 'rendering',
      label: t('brain.taste.rendering'),
      items: taste.preferredRendering ?? [],
      tone: 'neutral' as const,
    },
    {
      id: 'avoid',
      label: t('brain.taste.avoid'),
      items: taste.avoidedPatterns,
      tone: 'negative' as const,
    },
  ].filter((section) => section.id !== 'rendering' || section.items.length > 0);

  const hasPreferences = sections.some((section) => section.items.length > 0);

  return (
    <section className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-rose-400 shrink-0" />
          <h2 className="text-sm font-medium text-zinc-200">{t('brain.tasteProfile')}</h2>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">{t('brain.tasteProfileHint')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{t('brain.taste.signals')}</p>
          <p className="text-xl font-semibold text-zinc-100 mt-1">{taste.signalCount}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{t('brain.taste.signalsHint')}</p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{t('brain.taste.avgScore')}</p>
          <p className="text-xl font-semibold text-zinc-100 mt-1">
            {taste.averageScore.toFixed(1)}
            <span className="text-sm font-normal text-zinc-500">/10</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden" aria-hidden>
            <div
              className="h-full rounded-full bg-rose-500/80 transition-all"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </div>

      {!hasPreferences ? (
        <p className="text-sm text-zinc-500 py-2">{t('brain.taste.empty')}</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <TasteSection key={section.id} label={section.label} items={section.items} tone={section.tone} />
          ))}
        </div>
      )}
    </section>
  );
}

function TasteSection({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: 'positive' | 'neutral' | 'negative';
}) {
  if (items.length === 0) return null;

  const Icon = tone === 'negative' ? ThumbsDown : ThumbsUp;

  const chipClass =
    tone === 'positive'
      ? 'bg-emerald-900/25 text-emerald-200 border-emerald-900/40'
      : tone === 'negative'
        ? 'bg-red-900/20 text-red-200 border-red-900/35'
        : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';

  const iconClass =
    tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-red-400' : 'text-zinc-500';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} className={iconClass} />
        <p className="text-xs font-medium text-zinc-400">{label}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5" role="list">
        {items.map((item) => (
          <li key={item}>
            <span className={`inline-block text-xs px-2.5 py-1 rounded-full border ${chipClass}`}>
              {formatBrainLabel(item)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

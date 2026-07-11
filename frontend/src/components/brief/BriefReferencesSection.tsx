import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ExternalLink } from 'lucide-react';
import { getCatalogEntry } from '../../api';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';

export function BriefReferencesSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const designBrief = useAppStore((s) => s.designBrief);
  const appliedIds = designBrief.catalogReferenceIds ?? [];

  const { data: appliedEntries } = useQuery({
    queryKey: ['catalog-applied-brief', appliedIds],
    queryFn: async () =>
      Promise.all(
        appliedIds.map(async (id) => {
          try {
            return await getCatalogEntry(id);
          } catch {
            return { id, name: id.replace(/^ref-(import-)?/, '') };
          }
        }),
      ),
    enabled: appliedIds.length > 0,
  });

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-zinc-500 leading-relaxed">{t('brief.references.intro')}</p>

      <Link
        to="/logo-catalog"
        onClick={() => {
          sessionStorage.setItem('brief-build-section', 'references');
        }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-violet-800/50 bg-violet-950/30 hover:bg-violet-900/30 text-xs font-medium text-violet-200 transition-colors"
      >
        <BookOpen size={16} />
        {t('brief.references.openCatalog')}
        <ExternalLink size={14} className="opacity-60" />
      </Link>

      {appliedIds.length > 0 ? (
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-2">
          <p className="text-xs font-medium text-emerald-300">
            {appliedIds.length === 1
              ? t('brief.references.appliedCount', { count: appliedIds.length })
              : t('brief.references.appliedCountPlural', { count: appliedIds.length })}
          </p>
          <ul className="space-y-1">
            {(appliedEntries ?? appliedIds.map((id) => ({ id, name: id }))).map((entry) => (
              <li key={entry.id} className="text-[13px] text-emerald-100/90 truncate">
                {entry.name}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onStepComplete}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-medium"
          >
            {t('brief.references.continueToClient')}
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 text-center">{t('brief.references.empty')}</p>
      )}
    </div>
  );
}

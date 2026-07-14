import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ExternalLink, X } from 'lucide-react';
import { getCatalogEntry } from '../../api';
import { rememberBriefBuildSection } from '../../lib/brief-navigation';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { BriefRadioOption } from './BriefRadioOption';

export function BriefReferencesSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
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

  const removeReference = (id: string) => {
    updateDesignBrief({
      catalogReferenceIds: appliedIds.filter((refId) => refId !== id),
    });
  };

  const clearReferences = () => {
    updateDesignBrief({ catalogReferenceIds: [] });
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-zinc-500 leading-relaxed">{t('brief.references.intro')}</p>

      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500">{t('brief.references.catalogMode')}</p>
        <BriefRadioOption
          name="catalog-reference-mode"
          value="manual"
          checked={!designBrief.autoCatalogReferences}
          onChange={() => updateDesignBrief({ autoCatalogReferences: false })}
        >
          {t('brief.references.catalogModeManual')}
        </BriefRadioOption>
        <BriefRadioOption
          name="catalog-reference-mode"
          value="auto"
          checked={designBrief.autoCatalogReferences}
          onChange={() => updateDesignBrief({ autoCatalogReferences: true })}
        >
          {t('brief.references.autoCatalog')}
        </BriefRadioOption>
      </div>

      <Link
        to="/logo-catalog"
        onClick={() => {
          rememberBriefBuildSection('references');
        }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-violet-800/50 bg-violet-950/30 hover:bg-violet-900/30 text-xs font-medium text-violet-200 transition-colors"
      >
        <BookOpen size={16} />
        {t('brief.references.openCatalog')}
        <ExternalLink size={14} className="opacity-60" />
      </Link>

      {appliedIds.length > 0 ? (
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-emerald-300">
              {appliedIds.length === 1
                ? t('brief.references.appliedCount', { count: appliedIds.length })
                : t('brief.references.appliedCountPlural', { count: appliedIds.length })}
            </p>
            <button
              type="button"
              onClick={clearReferences}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 uppercase tracking-wide"
            >
              {t('brief.references.clearAll')}
            </button>
          </div>
          <ul className="space-y-1">
            {(appliedEntries ?? appliedIds.map((id) => ({ id, name: id }))).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-emerald-950/30 border border-emerald-800/20"
              >
                <span className="text-[13px] text-emerald-100/90 truncate">{entry.name}</span>
                <button
                  type="button"
                  onClick={() => removeReference(entry.id)}
                  className="shrink-0 p-0.5 rounded hover:bg-emerald-900/60 text-emerald-400 hover:text-red-300 transition-colors"
                  aria-label={`${t('common.remove')} ${entry.name}`}
                >
                  <X size={14} />
                </button>
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

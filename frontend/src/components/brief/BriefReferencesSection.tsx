import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ExternalLink } from 'lucide-react';
import { getCatalogEntry } from '../../api';
import { useAppStore } from '../../store';

export function BriefReferencesSection() {
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
      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Pick logos from Müller Logo Modernism as visual inspiration. References feed geometry,
        era, and principles into your brief.
      </p>

      <Link
        to="/logo-catalog"
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-violet-800/50 bg-violet-950/30 hover:bg-violet-900/30 text-xs font-medium text-violet-200 transition-colors"
      >
        <BookOpen size={14} />
        Open Logo Catalog
        <ExternalLink size={12} className="opacity-60" />
      </Link>

      {appliedIds.length > 0 ? (
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-2">
          <p className="text-[10px] font-medium text-emerald-300">
            {appliedIds.length} reference{appliedIds.length === 1 ? '' : 's'} applied
          </p>
          <ul className="space-y-1">
            {(appliedEntries ?? appliedIds.map((id) => ({ id, name: id }))).map((entry) => (
              <li key={entry.id} className="text-[11px] text-emerald-100/90 truncate">
                {entry.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-600 text-center">
          No references yet — optional, but improves sector fit
        </p>
      )}
    </div>
  );
}

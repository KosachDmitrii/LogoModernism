import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, Filter, X } from 'lucide-react';
import clsx from 'clsx';
import {
  getCatalogStats,
  getCatalogTaxonomy,
  searchCatalog,
  getCatalogEntry,
} from '../api';
import { useAppStore } from '../store';
import { ApplyToPromptsButton } from '../components/ApplyToPromptsButton';

interface CatalogEntry {
  id: string;
  name: string;
  designer?: string;
  year?: number;
  country?: string;
  industry: string;
  era: string;
  catalogChapter?: string;
  catalogSection?: string;
  entryKind?: string;
  markType?: string;
  significance?: string;
  principleIds: string[];
  geometry: string[];
  construction?: string[];
  minimalismLevel: number;
}

export function LogoCatalogPage() {
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const designBrief = useAppStore((s) => s.designBrief);

  const [chapter, setChapter] = useState('');
  const [section, setSection] = useState('');
  const [query, setQuery] = useState('');
  const [era, setEra] = useState('');
  const [entryKind, setEntryKind] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ['catalog-stats'], queryFn: getCatalogStats });
  const { data: taxonomy } = useQuery({ queryKey: ['catalog-taxonomy'], queryFn: getCatalogTaxonomy });

  const { data: results, isFetching } = useQuery({
    queryKey: ['catalog-search', chapter, section, query, era, entryKind],
    queryFn: () =>
      searchCatalog({
        chapter: chapter || undefined,
        section: section || undefined,
        q: query || undefined,
        era: era || undefined,
        entryKind: entryKind || undefined,
      }),
  });

  const appliedIds = designBrief.catalogReferenceIds ?? [];

  const { data: appliedEntries } = useQuery({
    queryKey: ['catalog-applied', appliedIds],
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

  const selected = useMemo(
    () => (results as CatalogEntry[] | undefined)?.find((e) => e.id === selectedId) ?? null,
    [results, selectedId],
  );

  const activeChapter = taxonomy?.find((c: { id: string }) => c.id === chapter);

  const mergeTags = (current: string, incoming: string[]) => {
    const merged = [...new Set([...current.split(',').map((s) => s.trim()).filter(Boolean), ...incoming])];
    return merged.join(', ');
  };

  const applySelected = () => {
    if (!selected) return;
    const existing = designBrief.catalogReferenceIds ?? [];
    const next = [...new Set([...existing, selected.id])].slice(0, 8);
    const principleIds = [...new Set([...(designBrief.principleIds ?? []), ...selected.principleIds])].slice(0, 24);
    const sources = designBrief.sources.includes('Logo Catalog')
      ? designBrief.sources
      : [...designBrief.sources, 'Logo Catalog'];
    updateDesignBrief({
      catalogReferenceIds: next,
      principleIds,
      era: selected.era.replace(/_/g, ' '),
      narrative: selected.significance ?? designBrief.narrative,
      geometry: selected.geometry?.length ? mergeTags(designBrief.geometry, selected.geometry) : designBrief.geometry,
      construction: selected.construction?.length
        ? mergeTags(designBrief.construction, selected.construction)
        : designBrief.construction,
      preferredShapes: selected.geometry?.length
        ? mergeTags(designBrief.preferredShapes, selected.geometry)
        : designBrief.preferredShapes,
      sources,
    });
  };

  const removeApplied = (id: string) => {
    updateDesignBrief({
      catalogReferenceIds: appliedIds.filter((refId) => refId !== id),
    });
  };

  const clearApplied = () => {
    updateDesignBrief({ catalogReferenceIds: [] });
  };

  const selectedIsApplied = selected ? appliedIds.includes(selected.id) : false;

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <BookOpen size={22} /> Logo Catalog
        </h1>
        <p className="text-sm text-zinc-500">
          Müller Logo Modernism — {stats?.total ?? '…'} references
          {stats?.imported != null && stats.imported > 0
            ? ` (${stats.curated ?? 111} curated + ${stats.imported} imported)`
            : ''}{' '}
          across {stats?.sections ?? 28} book sections
        </p>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr_320px] gap-6">
        {/* Taxonomy sidebar */}
        <aside className="space-y-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Chapters</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => { setChapter(''); setSection(''); }}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                !chapter ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900',
              )}
            >
              All ({stats?.total ?? '…'})
            </button>
            {taxonomy?.map((ch: { id: string; label: string; sections: { id: string; label: string }[] }) => (
              <div key={ch.id}>
                <button
                  type="button"
                  onClick={() => { setChapter(ch.id); setSection(''); }}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors capitalize',
                    chapter === ch.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900',
                  )}
                >
                  {ch.label}
                </button>
                {chapter === ch.id && (
                  <div className="ml-2 mt-1 space-y-0.5 border-l border-zinc-800 pl-2">
                    {ch.sections.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSection(sec.id)}
                        className={clsx(
                          'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                          section === sec.id ? 'text-zinc-100 bg-zinc-800/60' : 'text-zinc-500 hover:text-zinc-300',
                        )}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Featured</p>
            {[
              { kind: 'case_study', label: 'Case Studies' },
              { kind: 'designer_profile', label: 'Designers' },
            ].map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => { setEntryKind(kind); setChapter(''); setSection(''); }}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  entryKind === kind ? 'bg-emerald-900/40 text-emerald-300' : 'text-zinc-400 hover:bg-zinc-900',
                )}
              >
                {label}
              </button>
            ))}
            {entryKind && (
              <button
                type="button"
                onClick={() => setEntryKind('')}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3"
              >
                Clear filter
              </button>
            )}
          </div>
        </aside>

        {/* Results grid */}
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search logos, designers, geometry…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
              />
            </div>
            <select
              value={era}
              onChange={(e) => setEra(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none"
            >
              <option value="">All eras</option>
              {['swiss', 'bauhaus', 'international_style', 'corporate_identity', '1960s', '1970s', 'mid_century'].map((e) => (
                <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {activeChapter && (
            <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
              <Filter size={12} />
              {activeChapter.label}{section ? ` → ${activeChapter.sections.find((s: { id: string }) => s.id === section)?.label}` : ''}
              {isFetching && ' · loading…'}
            </p>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(results as CatalogEntry[] | undefined)?.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedId(entry.id)}
                className={clsx(
                  'text-left p-4 rounded-xl border transition-colors',
                  selectedId === entry.id
                    ? 'border-zinc-400 bg-zinc-900/80'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                  (designBrief.catalogReferenceIds ?? []).includes(entry.id) && 'ring-1 ring-emerald-600/50',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-medium text-zinc-200">{entry.name}</h3>
                  {entry.entryKind && entry.entryKind !== 'logo' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                      {entry.entryKind === 'case_study' ? 'Case' : 'Designer'}
                    </span>
                  )}
                </div>
                {entry.designer && (
                  <p className="text-xs text-zinc-500 mb-1">{entry.designer}{entry.year ? `, ${entry.year}` : ''}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize">
                    {entry.catalogSection?.replace(/-/g, ' ')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Q {entry.minimalismLevel.toFixed(0)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <aside className="lg:sticky lg:top-6 h-fit">
          {selected ? (
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                {selected.designer && (
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {selected.designer}{selected.year ? ` · ${selected.year}` : ''}{selected.country ? ` · ${selected.country}` : ''}
                  </p>
                )}
              </div>

              {selected.significance && (
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.significance}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta label="Chapter" value={selected.catalogChapter} />
                <Meta label="Section" value={selected.catalogSection?.replace(/-/g, ' ')} />
                <Meta label="Era" value={selected.era.replace(/_/g, ' ')} />
                <Meta label="Industry" value={selected.industry} />
                <Meta label="Mark" value={selected.markType} />
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Geometry</p>
                <div className="flex flex-wrap gap-1">
                  {selected.geometry.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{g}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                  Principles ({selected.principleIds.length})
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selected.principleIds.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">{p}</span>
                  ))}
                </div>
              </div>

              {selectedIsApplied ? (
                <button
                  type="button"
                  onClick={() => removeApplied(selected.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-800/60 bg-red-950/40 hover:bg-red-900/40 text-red-300 text-sm font-medium transition-colors"
                >
                  Убрать из Prompts
                  <X size={14} />
                </button>
              ) : (
                <ApplyToPromptsButton onApply={applySelected} />
              )}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-zinc-800 text-center">
              <p className="text-sm text-zinc-500">Select a logo to view analysis and apply to Prompts</p>
            </div>
          )}

          {appliedIds.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-emerald-300 font-medium">
                  Applied to Prompts ({appliedIds.length})
                </p>
                <button
                  type="button"
                  onClick={clearApplied}
                  className="text-[10px] text-emerald-400/80 hover:text-emerald-200 uppercase tracking-wide"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-1.5">
                {(appliedEntries ?? appliedIds.map((id) => ({ id, name: id }))).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/30"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className="text-xs text-emerald-100 truncate text-left hover:text-white"
                    >
                      {entry.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeApplied(entry.id)}
                      className="shrink-0 p-1 rounded hover:bg-emerald-900/60 text-emerald-400 hover:text-red-300 transition-colors"
                      aria-label={`Remove ${entry.name} from prompts`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
      <p className="text-zinc-600">{label}</p>
      <p className="text-zinc-300 capitalize mt-0.5">{value}</p>
    </div>
  );
}

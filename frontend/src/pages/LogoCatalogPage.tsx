import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search, X } from 'lucide-react';
import clsx from 'clsx';
import {
  getCatalogEntry,
  getCatalogRecommendations,
  getCatalogStats,
  getCatalogTaxonomy,
  searchCatalog,
} from '../api';
import { useAppStore } from '../store';
import { returnToBriefBuildSection } from '../lib/brief-navigation';
import { ApplyToPromptsButton } from '../components/ApplyToPromptsButton';
import { CustomSelect } from '../components/CustomSelect';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useT, type MessageKey } from '../i18n';
import { industryLabel, markTypeLabel } from '../lib/translate-labels';
import { sanitizeCatalogTagList, sanitizeBriefTagField } from '@logo-platform/shared';
import { useAuth } from '../auth/AuthProvider';

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
  industryScore?: number;
  logoImageUrl?: string;
}

const ERA_OPTIONS = [
  'swiss',
  'bauhaus',
  'international_style',
  'corporate_identity',
  '1960s',
  '1970s',
  'mid_century',
] as const;

const ERA_LABEL_KEYS: Record<(typeof ERA_OPTIONS)[number], MessageKey> = {
  swiss: 'prompts.era.swissInternational',
  bauhaus: 'prompts.era.bauhaus',
  international_style: 'prompts.era.internationalTypographic',
  corporate_identity: 'prompts.era.corporateIdentity',
  '1960s': 'prompts.era.1960s',
  '1970s': 'prompts.era.1970s',
  mid_century: 'prompts.era.midCentury',
};

export function LogoCatalogPage() {
  const t = useT();
  const { profile, activeMembership } = useAuth();
  const canApply = Boolean(
    profile && activeMembership && activeMembership.role !== 'VIEWER',
  );
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const designBrief = useAppStore((s) => s.designBrief);
  const projectIndustry = useAppStore((s) => s.industry);

  const [chapter, setChapter] = useState('');
  const [section, setSection] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [era, setEra] = useState('');
  const [entryKind, setEntryKind] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const eraFilterOptions = useMemo(
    () => [
      { value: '', label: t('catalog.allEras') },
      ...ERA_OPTIONS.map((option) => ({ value: option, label: t(ERA_LABEL_KEYS[option]) })),
    ],
    [t],
  );

  const { data: stats } = useQuery({
    queryKey: ['catalog-stats'],
    queryFn: ({ signal }) => getCatalogStats(signal),
  });
  const { data: taxonomy } = useQuery({
    queryKey: ['catalog-taxonomy'],
    queryFn: ({ signal }) => getCatalogTaxonomy(signal),
  });

  const { data: results, isFetching } = useQuery({
    queryKey: ['catalog-search', chapter, section, debouncedQuery, era, entryKind, projectIndustry],
    queryFn: ({ signal }) =>
      searchCatalog({
        chapter: chapter || undefined,
        section: section || undefined,
        q: debouncedQuery || undefined,
        era: era || undefined,
        entryKind: entryKind || undefined,
        rankByIndustry: projectIndustry || undefined,
      }, signal),
    placeholderData: (previous) => previous,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['catalog-recommend', projectIndustry, designBrief.markType],
    queryFn: ({ signal }) =>
      getCatalogRecommendations({
        industry: projectIndustry,
        markType: designBrief.markType || undefined,
        limit: 6,
      }, signal),
    enabled: Boolean(projectIndustry?.trim()),
  });

  const appliedIds = designBrief.catalogReferenceIds ?? [];

  const { data: appliedEntries } = useQuery({
    queryKey: ['catalog-applied', appliedIds],
    queryFn: async ({ signal }) =>
      Promise.all(
        appliedIds.map(async (id) => {
          try {
            return await getCatalogEntry(id, signal);
          } catch {
            return { id, name: id.replace(/^ref-(import-)?/, '') };
          }
        }),
      ),
    enabled: appliedIds.length > 0,
  });

  const recommendationMatch = useMemo(
    () => (recommendations as CatalogEntry[] | undefined)?.find((e) => e.id === selectedId) ?? null,
    [recommendations, selectedId],
  );

  const resultMatch = useMemo(
    () => (results as CatalogEntry[] | undefined)?.find((e) => e.id === selectedId) ?? null,
    [results, selectedId],
  );

  const { data: fetchedSelected } = useQuery({
    queryKey: ['catalog-entry', selectedId],
    queryFn: ({ signal }) => getCatalogEntry(selectedId!, signal),
    enabled: Boolean(selectedId) && !resultMatch && !recommendationMatch,
  });

  const selected = resultMatch ?? recommendationMatch ?? (fetchedSelected as CatalogEntry | null) ?? null;

  const focusEntry = (entry: CatalogEntry) => {
    setChapter('');
    setSection('');
    setEntryKind('');
    setEra('');
    setQuery(entry.name);
    setSelectedId(entry.id);
  };

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
    const cleanGeometry = sanitizeCatalogTagList(selected.geometry ?? []);
    const cleanConstruction = sanitizeCatalogTagList(selected.construction ?? []);
    updateDesignBrief({
      catalogReferenceIds: next,
      principleIds,
      era: selected.era.replace(/_/g, ' '),
      // Do not copy catalog significance into narrative — it leaks as Design brief note
      // and can instruct trademark likeness (e.g. interlocking Cs). Structure comes via refs.
      geometry: cleanGeometry.length
        ? sanitizeBriefTagField(mergeTags(designBrief.geometry, cleanGeometry))
        : designBrief.geometry,
      construction: cleanConstruction.length
        ? sanitizeBriefTagField(mergeTags(designBrief.construction, cleanConstruction))
        : designBrief.construction,
      preferredShapes: cleanGeometry.length
        ? sanitizeBriefTagField(mergeTags(designBrief.preferredShapes, cleanGeometry))
        : designBrief.preferredShapes,
      sources,
    });
    returnToBriefBuildSection('references', projectIndustry ?? '');
  };

  const removeApplied = (id: string) => {
    updateDesignBrief({
      catalogReferenceIds: appliedIds.filter((refId) => refId !== id),
    });
  };

  const selectedIsApplied = selected ? appliedIds.includes(selected.id) : false;

  const selectedIndustryScore = useMemo(() => {
    if (!selected) return null;
    if (selected.industryScore != null) return selected.industryScore;
    const rec = (recommendations as CatalogEntry[] | undefined)?.find((r) => r.id === selected.id);
    if (rec?.industryScore != null) return rec.industryScore;
    return null;
  }, [selected, recommendations]);

  const selectedIndustryMismatch =
    selectedIndustryScore != null && selectedIndustryScore < 0.35 && Boolean(projectIndustry?.trim());

  const statsSubtitle = [
    t('catalog.subtitle', { total: stats?.total ?? '…' }),
    stats?.imported != null && stats.imported > 0
      ? t('catalog.subtitleCurated', {
          curated: stats.curated ?? 111,
          imported: stats.imported,
        })
      : null,
    t('catalog.subtitleSections', { sections: stats?.sections ?? 28 }),
    projectIndustry ? t('catalog.subtitleSortedFor', { industry: industryLabel(projectIndustry, t) }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <PageContainer>
      <PageHeader page="catalog" subtitle={statsSubtitle} />

      <div className="grid lg:grid-cols-[220px_1fr_320px] gap-6">
        <aside className="space-y-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('catalog.chapters')}</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setChapter('');
                setSection('');
              }}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                !chapter ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900',
              )}
            >
              {t('catalog.all')} ({stats?.total ?? '…'})
            </button>
            {taxonomy?.map((ch: { id: string; label: string; sections: { id: string; label: string }[] }) => (
              <div key={ch.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChapter(ch.id);
                    setSection('');
                  }}
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
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('catalog.featured')}</p>
            {[
              { kind: 'case_study', labelKey: 'catalog.caseStudies' as MessageKey },
              { kind: 'designer_profile', labelKey: 'catalog.designers' as MessageKey },
            ].map(({ kind, labelKey }) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setEntryKind(kind);
                  setChapter('');
                  setSection('');
                }}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  entryKind === kind ? 'bg-emerald-900/40 text-emerald-300' : 'text-zinc-400 hover:bg-zinc-900',
                )}
              >
                {t(labelKey)}
              </button>
            ))}
            {entryKind && (
              <button
                type="button"
                onClick={() => setEntryKind('')}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3"
              >
                {t('catalog.clearFilter')}
              </button>
            )}
          </div>
        </aside>

        <div>
          {projectIndustry && (recommendations as CatalogEntry[] | undefined)?.length ? (
            <div className="mb-5 p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
              <p className="text-xs font-medium text-amber-300 uppercase tracking-wider mb-2">
                {t('catalog.recommendedFor', { industry: industryLabel(projectIndustry, t) })}
              </p>
              <div className="flex flex-wrap gap-2">
                {(recommendations as CatalogEntry[]).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => focusEntry(entry)}
                    className={clsx(
                      'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                      selectedId === entry.id
                        ? 'border-amber-400 bg-amber-900/40 text-amber-100'
                        : 'border-amber-800/50 bg-amber-950/30 text-amber-200/90 hover:border-amber-600',
                    )}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('catalog.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
              />
            </div>
            <CustomSelect
              value={era}
              onChange={setEra}
              options={eraFilterOptions}
              className="w-[200px] shrink-0"
            />
          </div>

          {activeChapter && (
            <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
              <Filter size={14} />
              {activeChapter.label}
              {section
                ? ` → ${activeChapter.sections.find((s: { id: string }) => s.id === section)?.label}`
                : ''}
              {isFetching && ` · ${t('catalog.loading')}`}
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
                  appliedIds.includes(entry.id) && 'ring-1 ring-emerald-600/50',
                )}
              >
                {entry.logoImageUrl ? (
                  <div className="mb-3 h-20 flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
                    <img
                      src={entry.logoImageUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-medium text-zinc-200">{entry.name}</h3>
                  {entry.entryKind && entry.entryKind !== 'logo' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                      {entry.entryKind === 'case_study' ? t('catalog.entryCase') : t('catalog.entryDesigner')}
                    </span>
                  )}
                </div>
                {entry.designer && (
                  <p className="text-xs text-zinc-500 mb-1">
                    {entry.designer}
                    {entry.year ? `, ${entry.year}` : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize">
                    {entry.catalogSection?.replace(/-/g, ' ')}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {t('catalog.qualityScore', { score: entry.minimalismLevel.toFixed(0) })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 h-fit">
          {selected ? (
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
              {selected.logoImageUrl ? (
                <div className="h-32 flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <img
                    src={selected.logoImageUrl}
                    alt={selected.name}
                    className="max-h-full max-w-full object-contain p-3"
                  />
                </div>
              ) : null}

              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                {selected.designer && (
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {selected.designer}
                    {selected.year ? ` · ${selected.year}` : ''}
                    {selected.country ? ` · ${selected.country}` : ''}
                  </p>
                )}
              </div>

              {selected.significance && (
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.significance}</p>
              )}

              {selectedIndustryMismatch && (
                <p className="text-xs text-amber-300/90 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40">
                  {t('catalog.industryMismatch', {
                    name: selected.name,
                    entryIndustry: selected.industry,
                    projectIndustry: industryLabel(projectIndustry ?? '', t),
                  })}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta labelKey="catalog.meta.chapter" value={selected.catalogChapter} />
                <Meta labelKey="catalog.meta.section" value={selected.catalogSection?.replace(/-/g, ' ')} />
                <Meta labelKey="catalog.meta.era" value={selected.era.replace(/_/g, ' ')} />
                <Meta labelKey="catalog.meta.industry" value={industryLabel(selected.industry, t)} />
                <Meta labelKey="catalog.meta.mark" value={selected.markType ? markTypeLabel(selected.markType, t) : undefined} />
              </div>

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">{t('catalog.meta.geometry')}</p>
                <div className="flex flex-wrap gap-1">
                  {selected.geometry.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                  {t('catalog.principlesCount', { count: selected.principleIds.length })}
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selected.principleIds.map((p) => (
                    <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {selectedIsApplied && canApply ? (
                <button
                  type="button"
                  onClick={() => removeApplied(selected.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-800/60 bg-red-950/40 hover:bg-red-900/40 text-red-300 text-sm font-medium transition-colors"
                >
                  {t('catalog.removeFromBrief')}
                  <X size={16} />
                </button>
              ) : canApply ? (
                <ApplyToPromptsButton onApply={applySelected} />
              ) : (
                <Link
                  to={profile ? '/pricing' : '/login'}
                  className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  {profile ? t('nav.pricing') : t('guest.signInToContinue')}
                </Link>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-zinc-800 text-center">
              <p className="text-sm text-zinc-500">{t('catalog.selectLogo')}</p>
            </div>
          )}

          {appliedIds.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
              <p className="text-xs text-emerald-300 font-medium mb-2">
                {t('catalog.appliedToBrief', { count: appliedIds.length })}
              </p>
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
                      aria-label={`${t('common.remove')} ${entry.name}`}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

function Meta({ labelKey, value }: { labelKey: MessageKey; value?: string }) {
  const t = useT();
  if (!value) return null;
  return (
    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
      <p className="text-zinc-600">{t(labelKey)}</p>
      <p className="text-zinc-300 capitalize mt-0.5">{value}</p>
    </div>
  );
}

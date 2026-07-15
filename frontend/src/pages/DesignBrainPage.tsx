import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  Upload,
  Globe,
  Loader2,
  Database,
  FileText,
  Check,
  X,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  approveBrainResearch,
  consolidateBrain,
  getBrainHealth,
  getBrainStats,
  getBrainTasteProfile,
  listBrainPrinciples,
  listBrainPrincipleCategories,
  listBrainResearchCandidates,
  previewBrainResearch,
  rejectBrainResearch,
  runBrainResearch,
} from '../api';
import type { BrainResearchCandidate } from '../types';
import type { LearnedPrinciplesSort } from '../types';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { BrainPrinciplesCard } from '../components/brain/BrainPrinciplesCard';
import { BrainPrinciplesFilters } from '../components/brain/BrainPrinciplesFilters';
import { BrainPrinciplesPagination, BRAIN_PRINCIPLES_PAGE_SIZE, BRAIN_TOP_PRINCIPLES_LIMIT } from '../components/brain/BrainPrinciplesPagination';
import { BrainTasteProfileCard } from '../components/brain/BrainTasteProfileCard';
import { BrainKnowledgeGraph } from '../components/brain/BrainKnowledgeGraph';
import {
  useBrainIngestStore,
  useIsBrainIngesting,
  useActiveBrainIngestJob,
  useActivePdfResumeRatio,
} from '../stores/brain-ingest-store';
import { useBrainPdfIngestProgress } from '../hooks/useBrainPdfIngestProgress';
import { useT, type MessageKey } from '../i18n';
import { formatError } from '../lib/api-error';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/permissions';
import { useToast } from '../components/ToastProvider';

type Tab = 'overview' | 'principles' | 'learn' | 'research';

export function DesignBrainPage() {
  const t = useT();
  const toast = useToast();
  const { profile } = useAuth();
  const canManageBrain = hasPermission(profile?.accessRole, 'brain.manage');
  const [tab, setTab] = useState<Tab>('overview');
  const [principlesPage, setPrinciplesPage] = useState(1);
  const [principlesCategory, setPrinciplesCategory] = useState('');
  const [principlesSort, setPrinciplesSort] = useState<LearnedPrinciplesSort>('influence_desc');
  const queryClient = useQueryClient();

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['brain-health'],
    queryFn: ({ signal }) => getBrainHealth(signal),
    enabled: canManageBrain,
  });
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['brain-stats'],
    queryFn: ({ signal }) => getBrainStats(signal),
  });
  const { data: taste, isLoading: tasteLoading } = useQuery({
    queryKey: ['brain-taste'],
    queryFn: ({ signal }) => getBrainTasteProfile(signal),
    enabled: tab === 'overview',
    staleTime: 60_000,
    retry: 1,
  });
  const { data: principlesData, isLoading: principlesLoading } = useQuery({
    queryKey: ['brain-principles'],
    queryFn: ({ signal }) => listBrainPrinciples(BRAIN_TOP_PRINCIPLES_LIMIT, 0, undefined, signal),
    enabled: tab === 'overview',
  });
  const principles = principlesData?.items;
  const { data: principlesPageData, isLoading: allPrinciplesLoading } = useQuery({
    queryKey: ['brain-principles-all', principlesPage, principlesCategory, principlesSort],
    queryFn: ({ signal }) =>
      listBrainPrinciples(
        BRAIN_PRINCIPLES_PAGE_SIZE,
        (principlesPage - 1) * BRAIN_PRINCIPLES_PAGE_SIZE,
        {
          category: principlesCategory || undefined,
          sort: principlesSort,
        },
        signal,
      ),
    enabled: tab === 'principles',
    placeholderData: (previousData) => previousData,
  });
  const { data: principleCategories = [] } = useQuery({
    queryKey: ['brain-principle-categories'],
    queryFn: ({ signal }) => listBrainPrincipleCategories(signal),
    enabled: tab === 'overview' || tab === 'principles',
  });

  const allPrinciples = principlesPageData?.items;
  const filteredPrinciplesTotal = principlesPageData?.total ?? 0;
  const totalPrinciplePages = Math.max(
    1,
    Math.ceil(filteredPrinciplesTotal / BRAIN_PRINCIPLES_PAGE_SIZE),
  );

  useEffect(() => {
    if (!principlesPageData) return;
    if (principlesPage > totalPrinciplePages) {
      setPrinciplesPage(totalPrinciplePages);
    }
  }, [principlesPage, principlesPageData, totalPrinciplePages]);
  const { data: pendingResearch, isLoading: pendingResearchLoading } = useQuery({
    queryKey: ['brain-research-pending'],
    queryFn: ({ signal }) => listBrainResearchCandidates('pending', signal),
    enabled: canManageBrain && tab === 'research',
  });

  const isLoading =
    (canManageBrain && healthLoading) ||
    statsLoading ||
    tasteLoading ||
    principlesLoading ||
    (canManageBrain && pendingResearchLoading);

  const [researchQuery, setResearchQuery] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [candidateActions, setCandidateActions] = useState<
    Record<string, 'approve' | 'reject'>
  >({});
  const lastInvalidatedRef = useRef<string | null>(null);

  const setCandidateAction = (id: string, action: 'approve' | 'reject' | null) => {
    setCandidateActions((prev) => {
      if (action === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: action };
    });
  };

  const handleApproveCandidate = async (id: string) => {
    setCandidateAction(id, 'approve');
    try {
      await approveBrainResearch(id);
      await queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principles-all'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principle-categories'] });
      toast.success(t('toast.researchApproved'));
    } catch (error) {
      toast.error(formatError(error, t));
    } finally {
      setCandidateAction(id, null);
    }
  };

  const handleRejectCandidate = async (id: string) => {
    setCandidateAction(id, 'reject');
    try {
      await rejectBrainResearch(id);
      await queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
      toast.success(t('toast.researchRejected'));
    } catch (error) {
      toast.error(formatError(error, t));
    } finally {
      setCandidateAction(id, null);
    }
  };

  const startPdfIngest = useBrainIngestStore((s) => s.startPdfIngest);
  const ingestJobs = useBrainIngestStore((s) => s.jobs);
  const activePdfJob = useActiveBrainIngestJob();
  const isPdfIngesting = useIsBrainIngesting();
  const resumeRatio = useActivePdfResumeRatio();
  const liveProgress = useBrainPdfIngestProgress(
    activePdfJob?.id,
    canManageBrain && isPdfIngesting,
    resumeRatio,
  );

  const latestPdfJob = ingestJobs[0];
  const latestFinishedAt = ingestJobs.find(
    (j) => j.status === 'done' || j.status === 'skipped',
  )?.finishedAt;

  useEffect(() => {
    if (!latestFinishedAt || latestFinishedAt === lastInvalidatedRef.current) return;
    lastInvalidatedRef.current = latestFinishedAt;
    queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
    queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
    queryClient.invalidateQueries({ queryKey: ['brain-principles-all'] });
  }, [latestFinishedAt, queryClient]);

  const handlePdfUpload = async (file: File) => {
    try {
      await startPdfIngest(file);
    } catch (error) {
      toast.error(formatError(error, t));
    }
  };

  const consolidate = useMutation({
    mutationFn: consolidateBrain,
    onSuccess: () => {
      setPrinciplesPage(1);
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principles-all'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principle-categories'] });
      queryClient.invalidateQueries({ queryKey: ['brain-taste'] });
      toast.success(t('toast.brainConsolidated'));
    },
    onError: (error) => toast.error(formatError(error, t)),
  });

  const researchRun = useMutation({
    mutationFn: () => runBrainResearch({ query: researchQuery.trim(), maxSources: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
      toast.success(t('toast.researchCompleted'));
    },
    onError: (error) => toast.error(formatError(error, t)),
  });

  const researchPreview = useMutation({
    mutationFn: () =>
      previewBrainResearch({ query: researchQuery.trim() || 'manual', url: manualUrl.trim() }),
    onSuccess: () => {
      setManualUrl('');
      queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
      toast.success(t('toast.urlPreviewed'));
    },
    onError: (error) => toast.error(formatError(error, t)),
  });

  const tabs: Array<{ id: Tab; labelKey: MessageKey; icon: typeof Brain }> = [
    { id: 'overview', labelKey: 'brain.tab.analytics', icon: Database },
    { id: 'principles', labelKey: 'brain.tab.principles', icon: BookOpen },
    ...(canManageBrain
      ? [
          { id: 'learn' as const, labelKey: 'brain.tab.upload' as MessageKey, icon: Upload },
          { id: 'research' as const, labelKey: 'brain.tab.research' as MessageKey, icon: Globe },
        ]
      : []),
  ];

  useEffect(() => {
    if (!canManageBrain && (tab === 'learn' || tab === 'research')) {
      setTab('overview');
    }
  }, [canManageBrain, tab]);

  return (
    <PageContainer>
      <PageHeader
        page="brain"
        subtitle={t('brain.subtitle')}
      >
        {canManageBrain && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <StatusPill ok={health?.databaseConfigured} label={t('brain.status.postgresql')} />
            <StatusPill ok={health?.embeddingConfigured} label={t('brain.status.embeddings')} />
            <StatusPill ok={stats?.pgvectorEnabled} label={t('brain.status.pgvector')} />
            <StatusPill ok={health?.tavilyConfigured} label={t('brain.status.tavily')} optional />
            <StatusPill ok={health?.braveConfigured} label={t('brain.status.brave')} optional />
            <StatusPill ok={health?.ocrConfigured} label={t('brain.status.ocr')} optional />
            {health?.nightlyResearchConfigured && (
              <StatusPill
                ok={health.nightlyResearchActive}
                label={t('brain.status.nightlyResearch')}
              />
            )}
          </div>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
          <Loader2 size={20} className="animate-spin" />
          {t('brain.loading')}
        </div>
      ) : (
        <>
      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        {tabs.map(({ id, labelKey, icon: Icon }) => {
          const isUploadTab = id === 'learn';
          const isResearchTab = id === 'research';
          const isResearching = researchRun.isPending || researchPreview.isPending;
          const tabLabel =
            isUploadTab && isPdfIngesting
              ? t('brain.tab.uploading')
              : isResearchTab && isResearching
                ? t('brain.tab.researching')
                : t(labelKey);
          const TabIcon =
            isUploadTab && isPdfIngesting
              ? Loader2
              : isResearchTab && isResearching
                ? Loader2
                : Icon;
          const tabIconSpinning =
            (isUploadTab && isPdfIngesting) || (isResearchTab && isResearching);

          return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-violet-900/50 text-violet-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <TabIcon size={16} className={tabIconSpinning ? 'animate-spin' : undefined} />
            {tabLabel}
            {id === 'research' && (pendingResearch?.length ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-200 text-[11px]">
                {pendingResearch!.length}
              </span>
            )}
            {id === 'principles' && (stats?.learnedPrinciples ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-900/50 text-violet-200 text-[11px]">
                {stats!.learnedPrinciples}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <BrainKnowledgeGraph
            categories={principleCategories}
            principles={principles}
            taste={taste}
            totalPrinciples={stats?.learnedPrinciples ?? 0}
            isIngesting={isPdfIngesting}
            isConsolidating={consolidate.isPending}
            consolidateResult={consolidate.data ?? null}
            onConsolidate={() => consolidate.mutate()}
            onCategorySelect={(category) => {
              setPrinciplesCategory(category);
              setPrinciplesPage(1);
              setTab('principles');
            }}
          />

          <div className="grid sm:grid-cols-4 gap-4">
            <StatCard label={t('brain.stat.experiences')} value={stats?.experiences ?? '—'} />
            <StatCard label={t('brain.stat.learnedRules')} value={stats?.learnedPrinciples ?? '—'} />
            <StatCard label={t('brain.stat.tasteSignals')} value={stats?.tasteSignals ?? '—'} />
            <StatCard label={t('brain.stat.pendingReview')} value={pendingResearch?.length ?? '—'} />
          </div>

          {stats?.bySourceType && (() => {
            const activeSources = Object.entries(stats.bySourceType).filter(([, count]) => count > 0);
            if (activeSources.length === 0) return null;
            const gridCols =
              activeSources.length >= 5
                ? 'sm:grid-cols-5'
                : activeSources.length === 4
                  ? 'sm:grid-cols-4'
                  : activeSources.length === 3
                    ? 'sm:grid-cols-3'
                    : activeSources.length === 2
                      ? 'sm:grid-cols-2'
                      : 'sm:grid-cols-1';
            return (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <p className="text-xs font-medium text-zinc-400 mb-3">{t('brain.knowledgeBySource')}</p>
                <div className={`grid gap-2 grid-cols-2 ${gridCols}`}>
                  {activeSources.map(([source, count]) => (
                    <div key={source} className="text-center p-2 rounded-lg bg-zinc-950/60">
                      <p className="text-lg font-semibold text-zinc-200">{count}</p>
                      <p className="text-xs text-zinc-500">{source}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {taste && <BrainTasteProfileCard taste={taste} />}

          {principles && principles.length > 0 && (
            <BrainPrinciplesCard
              principles={principles}
              limit={BRAIN_TOP_PRINCIPLES_LIMIT}
              totalCount={principlesData?.total}
              onViewAll={() => setTab('principles')}
            />
          )}
        </div>
      )}

      {tab === 'principles' && (
        <div className="space-y-4">
          <BrainPrinciplesFilters
            categories={principleCategories}
            category={principlesCategory}
            sort={principlesSort}
            onCategoryChange={(value) => {
              setPrinciplesCategory(value);
              setPrinciplesPage(1);
            }}
            onSortChange={(value) => {
              setPrinciplesSort(value);
              setPrinciplesPage(1);
            }}
          />

          {allPrinciplesLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
              <Loader2 size={20} className="animate-spin" />
              {t('brain.principlesLoading')}
            </div>
          ) : filteredPrinciplesTotal > 0 && allPrinciples && allPrinciples.length > 0 ? (
            <BrainPrinciplesCard
              principles={allPrinciples}
              totalCount={filteredPrinciplesTotal}
              rankOffset={(principlesPage - 1) * BRAIN_PRINCIPLES_PAGE_SIZE}
              titleKey="brain.allPrinciples"
              hintKey="brain.allPrinciplesHint"
              footer={
                <div className="pt-2 border-t border-zinc-800">
                  <BrainPrinciplesPagination
                    page={principlesPage}
                    totalItems={filteredPrinciplesTotal}
                    onPageChange={setPrinciplesPage}
                  />
                </div>
              }
            />
          ) : (
            <div className="p-8 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">
                {principlesCategory ? t('brain.principlesFilterEmpty') : t('brain.principlesEmpty')}
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                {principlesCategory
                  ? t('brain.principlesFilterEmptyHint')
                  : t('brain.principlesEmptyHint')}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'learn' && (
        <div className="space-y-8">
          <IngestSection
            title={t('brain.uploadPdfTitle')}
            description={t('brain.uploadPdfDescription')}
            icon={FileText}
          >
            <FileUpload
              accept=".pdf"
              loading={isPdfIngesting}
              disabled={isPdfIngesting}
              statusTitle={activePdfJob?.title}
              progress={liveProgress}
              onFile={handlePdfUpload}
            />
            {latestPdfJob?.status === 'done' && latestPdfJob.result && (
              <p className="text-xs text-emerald-400 mt-2">
                {t('brain.uploadStoredResult', {
                  chunks: latestPdfJob.result.chunksStored,
                  principles: latestPdfJob.result.principlesExtracted,
                })}
              </p>
            )}
          </IngestSection>
        </div>
      )}

      {tab === 'research' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <p className="text-sm text-zinc-300 font-medium">{t('brain.research.title')}</p>
            <p className="text-xs text-zinc-500">
              {t('brain.research.description')}
              {!health?.tavilyConfigured && !health?.braveConfigured && t('brain.research.noApiKeys')}
            </p>
            {health?.trustedDomains && (
              <p className="text-xs text-zinc-600">
                {t('brain.research.trusted', { domains: health.trustedDomains.slice(0, 4).join(', ') })}
              </p>
            )}
            <input
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder={t('brain.research.topicPlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && researchQuery.trim() && researchRun.mutate()}
            />
            <button
              type="button"
              onClick={() => researchRun.mutate()}
              disabled={!researchQuery.trim() || researchRun.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
            >
              {researchRun.isPending ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              {researchRun.isPending ? t('brain.research.researching') : t('brain.research.start')}
            </button>
          </div>

          {researchRun.data && researchRun.data.generatedQueries.length > 0 && (
            <div className="p-4 rounded-xl border border-violet-900/30 bg-violet-950/20 space-y-2">
              <p className="text-xs font-medium text-violet-300">
                {t('brain.research.topicLabel', { topic: researchRun.data.topic })}
              </p>
              <p className="text-xs text-zinc-600">
                {t('brain.research.brainstormed', {
                  discovered: researchRun.data.discoveredQueries?.length ?? researchRun.data.generatedQueries.length,
                  selected: researchRun.data.generatedQueries.length,
                })}
              </p>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{t('brain.research.selectedPhrases')}</p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {researchRun.data.generatedQueries.map((phrase) => (
                  <span
                    key={phrase}
                    className="text-xs px-2 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-600">
                {t('brain.research.foundSources', {
                  hits: researchRun.data.hits.length,
                  candidates: researchRun.data.candidates.length,
                })}
                {researchRun.data.skippedUrls.length > 0 &&
                  ` ${t('brain.research.skippedUrls', { count: researchRun.data.skippedUrls.length })}`}
              </p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <p className="text-xs font-medium text-zinc-400">{t('brain.research.previewUrl')}</p>
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder={t('brain.research.urlPlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm"
            />
            <button
              type="button"
              onClick={() => researchPreview.mutate()}
              disabled={!manualUrl.trim() || researchPreview.isPending}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              {researchPreview.isPending ? t('brain.research.fetching') : t('brain.research.previewButton')}
            </button>
          </div>


          {researchRun.data && researchRun.data.candidates.length === 0 && (
            <p className="text-xs text-amber-400">
              {t('brain.research.noCandidates')}
            </p>
          )}

          <div className="space-y-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              {t('brain.research.pendingApproval', { count: pendingResearch?.length ?? 0 })}
            </p>
            {(pendingResearch ?? []).map((candidate) => (
              <ResearchCandidateCard
                key={candidate.id}
                candidate={candidate}
                onApprove={() => handleApproveCandidate(candidate.id)}
                onReject={() => handleRejectCandidate(candidate.id)}
                isApproving={candidateActions[candidate.id] === 'approve'}
                isRejecting={candidateActions[candidate.id] === 'reject'}
              />
            ))}
            {!pendingResearch?.length && (
              <p className="text-sm text-zinc-600 py-8 text-center">
                {t('brain.research.emptyPending')}
              </p>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </PageContainer>
  );
}

function ResearchCandidateCard({
  candidate,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  candidate: BrainResearchCandidate;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const t = useT();

  return (
    <div className="p-5 rounded-xl border border-amber-900/30 bg-amber-950/10 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-200 font-medium">{candidate.sourceTitle}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t('brain.research.topicPrefix', { query: candidate.query })}
            {typeof candidate.sourceScore === 'number' && (
              <span className="text-violet-400">
                {t('brain.research.sourceScore', { score: candidate.sourceScore.toFixed(2) })}
              </span>
            )}
          </p>
        </div>
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-violet-400 shrink-0"
        >
          <ExternalLink size={16} />
        </a>
      </div>
      <p className="text-xs text-zinc-400">{candidate.summary}</p>
      {candidate.principles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500 uppercase">
            {t('brain.research.extractedPrinciples', { count: candidate.principles.length })}
          </p>
          {candidate.principles.map((p, i) => (
            <div key={i} className="text-xs p-2 rounded-lg bg-zinc-950/60">
              <span className="text-violet-400">[{p.category}]</span> {p.promptFragment}
              <p className="text-zinc-600 mt-0.5">{p.ruleText}</p>
              {p.citationQuote && (
                <p className="text-zinc-700 mt-1 italic line-clamp-2">“{p.citationQuote}”</p>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onApprove}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-wait"
        >
          {isApproving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {t('brain.research.approveLearn')}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-wait"
        >
          {isRejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          {t('common.reject')}
        </button>
      </div>
    </div>
  );
}

function StatusPill({ ok, label, optional }: { ok?: boolean; label: string; optional?: boolean }) {
  const t = useT();

  return (
    <span
      className={`px-2 py-0.5 rounded-full ${
        ok
          ? 'bg-emerald-900/40 text-emerald-300'
          : optional
            ? 'bg-zinc-800 text-zinc-500'
            : 'bg-red-900/30 text-red-300'
      }`}
    >
      {label}: {ok ? t('brain.status.ok') : optional ? t('brain.status.fallback') : t('brain.status.missing')}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-zinc-200 mt-1">{value}</p>
    </div>
  );
}

function IngestSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Brain;
  children: ReactNode;
}) {
  return (
    <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} className="text-violet-400" />
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">{description}</p>
      {children}
    </div>
  );
}

function FileUpload({
  accept,
  loading,
  disabled,
  statusTitle,
  progress,
  onFile,
}: {
  accept: string;
  loading: boolean;
  disabled?: boolean;
  statusTitle?: string;
  progress?: {
    pageCount?: number;
    percent: number;
    phase?: 'parsing' | 'processing' | 'done' | 'error' | 'queued' | 'skipped' | 'waiting';
    status?: 'queued' | 'parsing' | 'processing' | 'done' | 'skipped' | 'error' | 'waiting';
  } | null;
  onFile: (file: File) => void;
}) {
  const t = useT();

  const statusLine = progress?.pageCount
    ? t('brain.pagesProcessing', { count: progress.pageCount })
    : progress?.phase === 'queued' || progress?.status === 'queued'
      ? t('brain.ingest.queued')
      : progress?.phase === 'parsing'
        ? t('common.preparingPdf')
        : loading
          ? t('common.uploadingPdf')
          : null;

  const displayPercent = progress?.percent ?? null;

  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed transition-colors w-full ${
        loading
          ? 'border-violet-800/50 cursor-wait'
          : disabled
            ? 'border-zinc-800 opacity-50 cursor-not-allowed'
            : 'border-zinc-700 hover:border-violet-700 cursor-pointer'
      }`}
    >
      {loading ? <Loader2 size={28} className="animate-spin text-violet-400" /> : <Upload size={28} className="text-zinc-500" />}
      {loading ? (
        statusTitle ? (
          <>
            <p className="text-xs text-zinc-200 text-center">
              <span className="text-zinc-500">{t('brain.pdfLabel')}</span> {statusTitle}
              <span className="text-violet-400 ml-1">{t('brain.ingest.inProgress')}</span>
            </p>
            {statusLine && (
              <p className="text-xs text-zinc-500 text-center">{statusLine}</p>
            )}
            {displayPercent != null && (
              <div className="w-full max-w-xs mt-1">
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${displayPercent}%` }}
                  />
                </div>
                <p className="text-xs text-violet-400 text-center mt-1">{displayPercent}%</p>
              </div>
            )}
          </>
        ) : (
          <span className="text-xs text-violet-400">{t('common.uploadingPdf')}</span>
        )
      ) : (
        <span className="text-xs text-zinc-500">
          {t('common.clickToUpload')}
        </span>
      )}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

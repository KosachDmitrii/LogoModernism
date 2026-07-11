import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  Upload,
  Globe,
  Loader2,
  Database,
  RefreshCw,
  FileText,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  approveBrainResearch,
  consolidateBrain,
  getBrainHealth,
  getBrainStats,
  getBrainTasteProfile,
  listBrainPrinciples,
  listBrainResearchCandidates,
  previewBrainResearch,
  rejectBrainResearch,
  runBrainResearch,
} from '../api';
import type { BrainResearchCandidate } from '../types';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import {
  useBrainIngestStore,
  useIsBrainIngesting,
  useActiveBrainIngestJob,
  useActivePdfResumeRatio,
} from '../stores/brain-ingest-store';
import { useBrainPdfIngestProgress } from '../hooks/useBrainPdfIngestProgress';
import { useT, type MessageKey } from '../i18n';
import { formatError } from '../lib/api-error';

type Tab = 'overview' | 'learn' | 'research';

export function DesignBrainPage() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('overview');
  const queryClient = useQueryClient();

  const { data: health, isLoading: healthLoading } = useQuery({ queryKey: ['brain-health'], queryFn: getBrainHealth });
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['brain-stats'], queryFn: getBrainStats });
  const { data: taste, isLoading: tasteLoading } = useQuery({ queryKey: ['brain-taste'], queryFn: getBrainTasteProfile });
  const { data: principles, isLoading: principlesLoading } = useQuery({
    queryKey: ['brain-principles'],
    queryFn: () => listBrainPrinciples(20),
  });
  const { data: pendingResearch, isLoading: pendingResearchLoading, refetch: refetchPending } = useQuery({
    queryKey: ['brain-research-pending'],
    queryFn: () => listBrainResearchCandidates('pending'),
  });

  const isLoading =
    healthLoading || statsLoading || tasteLoading || principlesLoading || pendingResearchLoading;

  const [pdfTitle, setPdfTitle] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const lastInvalidatedRef = useRef<string | null>(null);

  const startPdfIngest = useBrainIngestStore((s) => s.startPdfIngest);
  const ingestJobs = useBrainIngestStore((s) => s.jobs);
  const activePdfJob = useActiveBrainIngestJob();
  const isPdfIngesting = useIsBrainIngesting();
  const resumeRatio = useActivePdfResumeRatio();
  const liveProgress = useBrainPdfIngestProgress(activePdfJob?.id, isPdfIngesting, resumeRatio);

  const latestPdfJob = ingestJobs[0];
  const displayPdfTitle = activePdfJob?.title ?? pdfTitle;
  const latestFinishedAt = ingestJobs.find(
    (j) => j.status === 'done' || j.status === 'skipped',
  )?.finishedAt;

  useEffect(() => {
    if (activePdfJob?.title && !pdfTitle.trim()) {
      setPdfTitle(activePdfJob.title);
    }
  }, [activePdfJob?.title, pdfTitle]);

  useEffect(() => {
    if (!latestFinishedAt || latestFinishedAt === lastInvalidatedRef.current) return;
    lastInvalidatedRef.current = latestFinishedAt;
    queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
    queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
  }, [latestFinishedAt, queryClient]);

  const handlePdfUpload = async (file: File) => {
    const title = pdfTitle.trim();
    if (!title) {
      setPdfError(t('brain.upload.titleRequired'));
      return;
    }
    setPdfError(null);
    try {
      await startPdfIngest(file, title);
    } catch (error) {
      setPdfError(formatError(error, t));
    }
  };

  const consolidate = useMutation({
    mutationFn: consolidateBrain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
      queryClient.invalidateQueries({ queryKey: ['brain-taste'] });
    },
  });

  const researchRun = useMutation({
    mutationFn: () => runBrainResearch({ query: researchQuery.trim(), maxSources: 30 }),
    onSuccess: () => {
      setResearchError(null);
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
    },
    onError: (error) => setResearchError(formatError(error, t)),
  });

  const researchPreview = useMutation({
    mutationFn: () =>
      previewBrainResearch({ query: researchQuery.trim() || 'manual', url: manualUrl.trim() }),
    onSuccess: () => {
      setResearchError(null);
      setManualUrl('');
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
    },
    onError: (error) => setResearchError(formatError(error, t)),
  });

  const approveResearch = useMutation({
    mutationFn: approveBrainResearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
      queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
    },
  });

  const rejectResearch = useMutation({
    mutationFn: rejectBrainResearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-research-pending'] });
    },
  });

  const tabs: Array<{ id: Tab; labelKey: MessageKey; icon: typeof Brain }> = [
    { id: 'overview', labelKey: 'brain.tab.analytics', icon: Database },
    { id: 'learn', labelKey: 'brain.tab.upload', icon: Upload },
    { id: 'research', labelKey: 'brain.tab.research', icon: Globe },
  ];

  return (
    <PageContainer>
      <PageHeader
        page="brain"
        subtitle={t('brain.subtitle')}
      >
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <StatusPill ok={health?.databaseConfigured} label={t('brain.status.postgresql')} />
          <StatusPill ok={health?.embeddingConfigured} label={t('brain.status.embeddings')} />
          <StatusPill ok={stats?.pgvectorEnabled} label={t('brain.status.pgvector')} />
          <StatusPill ok={health?.tavilyConfigured} label={t('brain.status.tavily')} optional />
          <StatusPill ok={health?.braveConfigured} label={t('brain.status.brave')} optional />
          <StatusPill ok={health?.ocrConfigured} label={t('brain.status.ocr')} optional />
          {health?.nightlyResearch && (
            <span className="px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 text-xs">
              {t('brain.status.nightlyResearch')}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        {tabs.map(({ id, labelKey, icon: Icon }) => {
          const isUploadTab = id === 'learn';
          const tabLabel = isUploadTab && isPdfIngesting ? t('brain.tab.uploading') : t(labelKey);
          const TabIcon = isUploadTab && isPdfIngesting ? Loader2 : Icon;

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
            <TabIcon size={16} className={isUploadTab && isPdfIngesting ? 'animate-spin' : undefined} />
            {tabLabel}
            {id === 'research' && (pendingResearch?.length ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-200 text-[11px]">
                {pendingResearch!.length}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
          <Loader2 size={20} className="animate-spin" />
          {t('brain.loading')}
        </div>
      ) : (
        <>
      {tab === 'overview' && (
        <div className="space-y-6">
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

          {taste && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-2">{t('brain.tasteProfile')}</p>
              <p className="text-sm text-zinc-300">{taste.summary}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {taste.preferredGeometry.map((g) => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300">
                    +{g}
                  </span>
                ))}
                {(taste.preferredColors ?? []).map((c) => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300">
                    {t('brain.taste.colorTag', { value: c })}
                  </span>
                ))}
                {(taste.preferredRendering ?? []).map((r) => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-violet-900/30 text-violet-300">
                    {t('brain.taste.renderTag', { value: r })}
                  </span>
                ))}
                {taste.avoidedPatterns.map((a) => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-red-900/20 text-red-300">
                    −{a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {principles && principles.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-3">{t('brain.topPrinciples')}</p>
              <div className="space-y-2">
                {principles.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="text-zinc-300">{p.promptFragment}</p>
                      <p className="text-zinc-600 mt-0.5">{p.ruleText}</p>
                      {p.citations?.[0] && (
                        <p className="text-zinc-700 mt-1 italic line-clamp-2">
                          “{p.citations[0].quote}”
                        </p>
                      )}
                    </div>
                    <span className="text-violet-400 shrink-0">
                      {t('brain.principleWeight', { weight: p.weight.toFixed(1) })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => consolidate.mutate()}
            disabled={consolidate.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {consolidate.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t('brain.runConsolidate')}
          </button>
          {consolidate.data && (
            <p className="text-xs text-zinc-500">
              {t('brain.consolidateResult', {
                merged: consolidate.data.mergedPrinciples,
                pruned: consolidate.data.prunedPrinciples,
                deduped: consolidate.data.deduplicatedExperiences,
              })}
            </p>
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
            <label className="block text-xs text-zinc-500 mb-1">
              {t('brain.uploadTitleLabel')} <span className="text-red-400">*</span>
            </label>
            <input
              value={displayPdfTitle}
              onChange={(e) => {
                setPdfTitle(e.target.value);
                if (e.target.value.trim()) setPdfError(null);
              }}
              placeholder={t('brain.uploadTitlePlaceholder')}
              disabled={isPdfIngesting}
              className="w-full mb-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm disabled:opacity-60"
            />
            <FileUpload
              accept=".pdf"
              loading={isPdfIngesting}
              disabled={!displayPdfTitle.trim() && !isPdfIngesting}
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
            {pdfError && <p className="text-xs text-red-400 mt-2">{pdfError}</p>}
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

          {researchError && <p className="text-xs text-red-400">{researchError}</p>}

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
                onApprove={() => approveResearch.mutate(candidate.id)}
                onReject={() => rejectResearch.mutate(candidate.id)}
                isApproving={approveResearch.isPending && approveResearch.variables === candidate.id}
                isRejecting={rejectResearch.isPending && rejectResearch.variables === candidate.id}
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
        >
          {isApproving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {t('brain.research.approveLearn')}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 disabled:opacity-50"
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
    phase?: 'parsing' | 'processing' | 'done' | 'error' | 'waiting';
  } | null;
  onFile: (file: File) => void;
}) {
  const t = useT();

  const statusLine = progress?.pageCount
    ? t('brain.pagesProcessing', { count: progress.pageCount })
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
          {disabled ? t('common.enterTitleFirst') : t('common.clickToUpload')}
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

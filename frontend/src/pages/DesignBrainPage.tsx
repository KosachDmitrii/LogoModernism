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
} from '../stores/brain-ingest-store';

type Tab = 'overview' | 'learn' | 'research';

export function DesignBrainPage() {
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

  const latestPdfJob = ingestJobs[0];
  const latestFinishedAt = ingestJobs.find(
    (j) => j.status === 'done' || j.status === 'skipped',
  )?.finishedAt;

  useEffect(() => {
    if (!latestFinishedAt || latestFinishedAt === lastInvalidatedRef.current) return;
    lastInvalidatedRef.current = latestFinishedAt;
    queryClient.invalidateQueries({ queryKey: ['brain-stats'] });
    queryClient.invalidateQueries({ queryKey: ['brain-principles'] });
  }, [latestFinishedAt, queryClient]);

  const handlePdfUpload = async (file: File) => {
    const title = pdfTitle.trim();
    if (!title) {
      setPdfError('Title is required');
      return;
    }
    setPdfError(null);
    try {
      await startPdfIngest(file, title);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : String(error));
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
    onError: (error) => setResearchError(String(error)),
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
    onError: (error) => setResearchError(String(error)),
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

  const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: 'overview', label: 'Analytics', icon: Database },
    { id: 'learn', label: 'Upload', icon: Upload },
    { id: 'research', label: 'Research', icon: Globe },
  ];

  return (
    <PageContainer>
      <PageHeader
        page="brain"
        subtitle="Central knowledge base — upload sources, research, taste signals. Applied automatically when composing prompts."
      >
        <div className="flex flex-wrap gap-2 mt-3 text-[10px]">
          <StatusPill ok={health?.databaseConfigured} label="PostgreSQL" />
          <StatusPill ok={health?.embeddingConfigured} label="Embeddings" />
          <StatusPill ok={stats?.pgvectorEnabled} label="pgvector" />
          <StatusPill ok={health?.tavilyConfigured} label="Tavily" optional />
          <StatusPill ok={health?.braveConfigured} label="Brave" optional />
          <StatusPill ok={health?.ocrConfigured} label="OCR" optional />
          {health?.nightlyResearch && (
            <span className="px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 text-[10px]">
              Nightly research
            </span>
          )}
        </div>
      </PageHeader>

      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        {tabs.map(({ id, label, icon: Icon }) => (
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
            <Icon size={14} />
            {label}
            {id === 'research' && (pendingResearch?.length ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-200 text-[9px]">
                {pendingResearch!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
          <Loader2 size={18} className="animate-spin" />
          Loading brain data…
        </div>
      ) : (
        <>
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-4">
            <StatCard label="Experiences" value={stats?.experiences ?? '—'} />
            <StatCard label="Learned rules" value={stats?.learnedPrinciples ?? '—'} />
            <StatCard label="Taste signals" value={stats?.tasteSignals ?? '—'} />
            <StatCard label="Pending review" value={pendingResearch?.length ?? '—'} />
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
                <p className="text-xs font-medium text-zinc-400 mb-3">Knowledge by source</p>
                <div className={`grid gap-2 grid-cols-2 ${gridCols}`}>
                  {activeSources.map(([source, count]) => (
                    <div key={source} className="text-center p-2 rounded-lg bg-zinc-950/60">
                      <p className="text-lg font-semibold text-zinc-200">{count}</p>
                      <p className="text-[10px] text-zinc-500">{source}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {taste && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-2">Taste profile</p>
              <p className="text-sm text-zinc-300">{taste.summary}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {taste.preferredGeometry.map((g) => (
                  <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300">
                    +{g}
                  </span>
                ))}
                {taste.avoidedPatterns.map((a) => (
                  <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/20 text-red-300">
                    −{a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {principles && principles.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-3">Top learned principles</p>
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
                    <span className="text-violet-400 shrink-0">w={p.weight.toFixed(1)}</span>
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
            {consolidate.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Run consolidate
          </button>
          {consolidate.data && (
            <p className="text-xs text-zinc-500">
              Merged {consolidate.data.mergedPrinciples}, pruned {consolidate.data.prunedPrinciples},
              deduped {consolidate.data.deduplicatedExperiences} experiences
            </p>
          )}
        </div>
      )}

      {tab === 'learn' && (
        <div className="space-y-8">
          <IngestSection
            title="Upload PDF book"
            description="Extract design principles from books (Logo Modernism, Peters, etc.)"
            icon={FileText}
          >
            <label className="block text-xs text-zinc-500 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={pdfTitle}
              onChange={(e) => {
                setPdfTitle(e.target.value);
                if (e.target.value.trim()) setPdfError(null);
              }}
              placeholder="e.g. Logo Modernism"
              className="w-full mb-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
            />
            <FileUpload
              accept=".pdf"
              loading={isPdfIngesting}
              disabled={!pdfTitle.trim()}
              onFile={handlePdfUpload}
            />
            {activePdfJob && (
              <p className="text-xs text-violet-400 mt-2">{activePdfJob.message}</p>
            )}
            {latestPdfJob?.status === 'done' && latestPdfJob.result && (
              <p className="text-xs text-emerald-400 mt-2">
                Stored {latestPdfJob.result.chunksStored} chunks, {latestPdfJob.result.principlesExtracted} principles
              </p>
            )}
            {pdfError && <p className="text-xs text-red-400 mt-2">{pdfError}</p>}
          </IngestSection>
        </div>
      )}

      {tab === 'research' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Autonomous research</p>
            <p className="text-xs text-zinc-500">
              Enter a topic — Brain composes search phrases, searches Tavily + Wikipedia + Brave +
              Internet Archive in parallel, extracts principles with citations, and waits for approval.
              {!health?.tavilyConfigured && !health?.braveConfigured &&
                ' Without API keys, Wikipedia + Archive are still used.'}
            </p>
            {health?.trustedDomains && (
              <p className="text-[10px] text-zinc-600">
                Trusted: {health.trustedDomains.slice(0, 4).join(', ')}…
              </p>
            )}
            <input
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder="Topic e.g. Swiss modernism, Paul Rand, aviation logos"
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && researchQuery.trim() && researchRun.mutate()}
            />
            <button
              type="button"
              onClick={() => researchRun.mutate()}
              disabled={!researchQuery.trim() || researchRun.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
            >
              {researchRun.isPending ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              {researchRun.isPending ? 'Researching…' : 'Start autonomous research'}
            </button>
          </div>

          {researchRun.data && researchRun.data.generatedQueries.length > 0 && (
            <div className="p-4 rounded-xl border border-violet-900/30 bg-violet-950/20 space-y-2">
              <p className="text-xs font-medium text-violet-300">
                Topic: {researchRun.data.topic}
              </p>
              <p className="text-[10px] text-zinc-600">
                Brainstormed {researchRun.data.discoveredQueries?.length ?? researchRun.data.generatedQueries.length} phrases
                → selected {researchRun.data.generatedQueries.length} most significant
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Selected search phrases</p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {researchRun.data.generatedQueries.map((phrase) => (
                  <span
                    key={phrase}
                    className="text-[10px] px-2 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600">
                Found {researchRun.data.hits.length} sources · {researchRun.data.candidates.length} new candidates
                {researchRun.data.skippedUrls.length > 0 &&
                  ` · ${researchRun.data.skippedUrls.length} skipped`}
              </p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <p className="text-xs font-medium text-zinc-400">Or preview a specific URL</p>
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm"
            />
            <button
              type="button"
              onClick={() => researchPreview.mutate()}
              disabled={!manualUrl.trim() || researchPreview.isPending}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              {researchPreview.isPending ? 'Fetching…' : 'Preview URL'}
            </button>
          </div>

          {researchError && <p className="text-xs text-red-400">{researchError}</p>}

          {researchRun.data && researchRun.data.candidates.length === 0 && (
            <p className="text-xs text-amber-400">
              No new candidates extracted. Try a different query or paste a Wikipedia URL directly.
            </p>
          )}

          <div className="space-y-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Pending approval ({pendingResearch?.length ?? 0})
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
                No pending research. Run a search to discover knowledge from the open web.
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
  return (
    <div className="p-5 rounded-xl border border-amber-900/30 bg-amber-950/10 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-200 font-medium">{candidate.sourceTitle}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Topic: {candidate.query}
            {typeof candidate.sourceScore === 'number' && (
              <span className="text-violet-400"> · score {candidate.sourceScore.toFixed(2)}</span>
            )}
          </p>
        </div>
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-violet-400 shrink-0"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      <p className="text-xs text-zinc-400">{candidate.summary}</p>
      {candidate.principles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-500 uppercase">Extracted principles ({candidate.principles.length})</p>
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
          {isApproving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Approve & learn
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 disabled:opacity-50"
        >
          {isRejecting ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Reject
        </button>
      </div>
    </div>
  );
}

function StatusPill({ ok, label, optional }: { ok?: boolean; label: string; optional?: boolean }) {
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
      {label}: {ok ? 'OK' : optional ? 'fallback' : 'missing'}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
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
        <Icon size={16} className="text-violet-400" />
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
  onFile,
}: {
  accept: string;
  loading: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed transition-colors ${
        disabled
          ? 'border-zinc-800 opacity-50 cursor-not-allowed'
          : 'border-zinc-700 hover:border-violet-700 cursor-pointer'
      }`}
    >
      {loading ? <Loader2 size={24} className="animate-spin text-violet-400" /> : <Upload size={24} className="text-zinc-500" />}
      <span className="text-xs text-zinc-500">{disabled ? 'Enter title first' : 'Click to upload'}</span>
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

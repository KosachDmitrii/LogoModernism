import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, RefreshCw, FileImage, Layers } from 'lucide-react';
import clsx from 'clsx';
import {
  getCatalogImportStats,
  listCatalogCandidates,
  approveCatalogCandidate,
  rejectCatalogCandidate,
  bulkApproveCatalogCandidates,
  bulkRejectCatalogCandidates,
  syncImportedCatalog,
  catalogPageImageUrl,
} from '../api';

interface Candidate {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  sourcePage: number;
  name: string;
  industry: string;
  designer?: string;
  year?: number;
  country?: string;
  catalogSection?: string;
  era?: string;
  markType?: string;
  significance?: string;
  principleIds: string[];
  confidence: number;
  pageImagePath?: string;
}

export function CatalogReviewPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['catalog-import-stats'],
    queryFn: getCatalogImportStats,
    refetchInterval: 30_000,
  });

  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ['catalog-candidates', statusFilter],
    queryFn: () => listCatalogCandidates(statusFilter || undefined),
  });

  const selected = useMemo(
    () => (candidates as Candidate[]).find((c) => c.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  const approveMut = useMutation({
    mutationFn: (id: string) => approveCatalogCandidate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-candidates'] });
      qc.invalidateQueries({ queryKey: ['catalog-import-stats'] });
      qc.invalidateQueries({ queryKey: ['catalog-stats'] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => rejectCatalogCandidate(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-candidates'] });
      qc.invalidateQueries({ queryKey: ['catalog-import-stats'] });
    },
  });

  const syncMut = useMutation({
    mutationFn: syncImportedCatalog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-stats'] }),
  });

  const bulkApproveMut = useMutation({
    mutationFn: async () => {
      const pending = (await listCatalogCandidates('pending')) as Candidate[];
      if (pending.length === 0) return { approved: 0 };
      return bulkApproveCatalogCandidates(pending.map((c) => c.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-candidates'] });
      qc.invalidateQueries({ queryKey: ['catalog-import-stats'] });
      qc.invalidateQueries({ queryKey: ['catalog-stats'] });
    },
  });

  const bulkRejectMut = useMutation({
    mutationFn: async () => {
      const approved = (await listCatalogCandidates('approved')) as Candidate[];
      if (approved.length === 0) return { rejected: 0 };
      return bulkRejectCatalogCandidates(approved.map((c) => c.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-candidates'] });
      qc.invalidateQueries({ queryKey: ['catalog-import-stats'] });
      qc.invalidateQueries({ queryKey: ['catalog-stats'] });
    },
  });

  const allApproved =
    stats != null &&
    stats.pending === 0 &&
    stats.approved > 0 &&
    stats.totalCandidates === stats.approved;

  const handleApproveAllPending = () => {
    const count = stats?.pending ?? 0;
    if (count === 0) return;
    if (!window.confirm(`Approve all ${count} pending candidates?`)) return;
    bulkApproveMut.mutate();
  };

  const handleRejectAllApproved = () => {
    const count = stats?.approved ?? 0;
    if (count === 0) return;
    if (!window.confirm(`Reject all ${count} approved candidates? They will be removed from the catalog.`)) return;
    bulkRejectMut.mutate();
  };

  const pageFilename = selected?.pageImagePath?.split('/').pop() ?? '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Layers size={22} />
            Catalog Import Review
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            PDF → Vision extraction → human review → merge into Logo Catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allApproved ? (
            <button
              type="button"
              onClick={handleRejectAllApproved}
              disabled={bulkRejectMut.isPending}
              className="px-3 py-2 text-sm rounded-lg bg-red-900/80 hover:bg-red-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <X size={14} />
              {bulkRejectMut.isPending ? 'Rejecting…' : 'Reject all approved'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApproveAllPending}
              disabled={bulkApproveMut.isPending || !stats?.pending}
              className="px-3 py-2 text-sm rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={14} />
              {bulkApproveMut.isPending ? 'Approving…' : 'Approve all pending'}
            </button>
          )}
          <button
            type="button"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            className="px-3 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            Sync to Catalog
          </button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Pages', stats.extractedPages],
            ['Candidates', stats.totalCandidates],
            ['Pending', stats.pending],
            ['Approved', stats.approved],
            ['Rejected', stats.rejected],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-semibold mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'rejected', ''] as const).map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm capitalize',
              statusFilter === s ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300',
            )}
          >
            {s || 'all'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-zinc-800"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 border border-zinc-800 rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-zinc-500">Loading candidates…</p>
          ) : (candidates as Candidate[]).length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-2">
              <FileImage className="mx-auto opacity-50" />
              <p className="text-sm">No candidates in this filter.</p>
            </div>
          ) : (
            <ul>
              {(candidates as Candidate[]).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={clsx(
                      'w-full text-left px-4 py-3 border-b border-zinc-800/80 hover:bg-zinc-900/80',
                      selectedId === c.id && 'bg-zinc-800/60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{c.name}</span>
                      <span className="text-[10px] uppercase text-zinc-500 shrink-0">p.{c.sourcePage}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {c.industry} · {c.year ?? '—'} · {Math.round(c.confidence * 100)}%
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 border border-zinc-800 rounded-xl p-5 space-y-4">
          {!selected ? (
            <p className="text-sm text-zinc-500">Select a candidate to review.</p>
          ) : (
            <>
              {pageFilename && (
                <img
                  src={catalogPageImageUrl(pageFilename)}
                  alt={`Page ${selected.sourcePage}`}
                  className="w-full rounded-lg border border-zinc-800"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {selected.industry}
                  {selected.designer ? ` · ${selected.designer}` : ''}
                  {selected.year ? ` · ${selected.year}` : ''}
                  {selected.country ? ` · ${selected.country}` : ''}
                </p>
              </div>
              {selected.significance && (
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.significance}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {selected.catalogSection && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800">{selected.catalogSection}</span>
                )}
                {selected.era && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800">{selected.era}</span>
                )}
                {selected.markType && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800">{selected.markType}</span>
                )}
                {selected.principleIds.slice(0, 6).map((p) => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
                    {p}
                  </span>
                ))}
              </div>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Review notes (optional, for reject)"
                className="w-full h-20 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => approveMut.mutate(selected.id)}
                  disabled={approveMut.isPending || selected.status === 'approved'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm disabled:opacity-50"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => rejectMut.mutate({ id: selected.id, notes: editNotes || undefined })}
                  disabled={rejectMut.isPending || selected.status === 'rejected'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-sm disabled:opacity-50"
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

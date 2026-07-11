import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { analyzeGeometry, getPrimitives } from '../../api';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { formatError } from '../../lib/api-error';

interface GeometryRec {
  primitiveId: string;
  name: string;
  score: number;
  svgPreview: string;
  reason: string;
}

interface Primitive {
  id: string;
  name: string;
  svgPath: string;
}

export function BriefShapesSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const industry = useAppStore((s) => s.industry);
  const applyGeometry = useAppStore((s) => s.applyGeometry);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const { data: primitives } = useQuery({ queryKey: ['primitives'], queryFn: getPrimitives });

  const analysis = useMutation({
    mutationFn: () => analyzeGeometry({ industry, complexity: 'minimal' }),
  });

  const recommendations = (analysis.data?.recommendations ?? []) as GeometryRec[];

  useEffect(() => {
    if (recommendations.length > 0) {
      setSelectedIds(recommendations.map((r) => r.primitiveId));
    }
  }, [analysis.data]);

  const recById = useMemo(
    () => new Map(recommendations.map((r) => [r.primitiveId, r])),
    [recommendations],
  );

  const primById = useMemo(
    () => new Map((primitives as Primitive[] | undefined)?.map((p) => [p.id, p]) ?? []),
    [primitives],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    if (!analysis.data || selectedIds.length === 0) return;

    const selectedRecommendations = selectedIds.map((id) => {
      const rec = recById.get(id);
      if (rec) {
        return { name: rec.name, score: rec.score, reason: rec.reason };
      }
      const prim = primById.get(id);
      return {
        name: prim?.name ?? id,
        reason: t('brief.shapes.addedFromLibrary'),
      };
    });

    applyGeometry(industry, {
      ...analysis.data,
      selectedRecommendations,
    });
    onStepComplete?.();
  };

  const canAnalyze = Boolean(industry.trim());
  const primitiveCount = (primitives as Primitive[] | undefined)?.length ?? 0;

  return (
    <div className="space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => analysis.mutate()}
        disabled={!canAnalyze || analysis.isPending}
        className="w-full px-3 py-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
        {t('brief.shapes.analyze')}
      </button>

      {!canAnalyze && (
        <p className="text-xs text-amber-300/80">{t('brief.typography.setIndustryFirst')}</p>
      )}

      {analysis.isError && (
        <p className="text-xs text-red-400">
          {formatError(analysis.error, t)}
        </p>
      )}

      {analysis.data && recommendations.length > 0 && (
        <>
          <p className="text-xs text-zinc-500">
            {selectedIds.length === 1
              ? t('brief.shapes.selectedCount', { count: selectedIds.length })
              : t('brief.shapes.selectedCountPlural', { count: selectedIds.length })}
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {recommendations.map((rec) => {
              const isSelected = selectedIds.includes(rec.primitiveId);
              return (
                <button
                  key={rec.primitiveId}
                  type="button"
                  onClick={() => toggleSelection(rec.primitiveId)}
                  className={clsx(
                    'relative p-2 rounded-lg border text-left transition-colors',
                    isSelected
                      ? 'bg-zinc-900 border-emerald-700/50'
                      : 'bg-zinc-950/40 border-zinc-800 opacity-60',
                  )}
                >
                  <div className="flex justify-between items-start mb-1 pr-4">
                    <span className="text-xs font-medium truncate">{rec.name}</span>
                    <span className="text-xs text-zinc-500">{rec.score}/10</span>
                  </div>
                  <svg viewBox="0 0 100 100" className="w-full h-10 stroke-zinc-300 fill-none">
                    <path d={rec.svgPreview} strokeWidth="2" />
                  </svg>
                  {isSelected ? (
                    <X size={10} className="absolute top-1.5 right-1.5 text-emerald-400" />
                  ) : (
                    <Plus size={10} className="absolute top-1.5 right-1.5 text-zinc-500" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleApply}
            className="w-full px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs font-medium disabled:opacity-40"
          >
            {t('brief.shapes.apply')}
          </button>

          {primitives && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {expanded ? t('brief.shapes.hideLibrary') : t('brief.shapes.showLibrary')}{' '}
                {t('brief.shapes.primitiveLibrary', { count: primitiveCount })}
              </button>
              {expanded && (
                <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                  {(primitives as Primitive[]).map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleSelection(p.id)}
                        className={clsx(
                          'p-1.5 rounded border text-center',
                          isSelected
                            ? 'border-emerald-800/50 bg-emerald-950/30'
                            : 'border-zinc-800 bg-zinc-950/50',
                        )}
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-8 stroke-zinc-400 fill-none">
                          <path d={p.svgPath} strokeWidth="2" />
                        </svg>
                        <p className="text-[11px] text-zinc-500 truncate">{p.name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

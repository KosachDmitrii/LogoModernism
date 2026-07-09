import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { analyzeGeometry, getPrimitives } from '../../api';
import { useAppStore } from '../../store';

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

export function BriefShapesSection() {
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
        reason: 'Added from primitive library',
      };
    });

    applyGeometry(industry, {
      ...analysis.data,
      selectedRecommendations,
    });
  };

  const canAnalyze = Boolean(industry.trim());

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => analysis.mutate()}
        disabled={!canAnalyze || analysis.isPending}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {analysis.isPending && <Loader2 size={12} className="animate-spin" />}
        Analyze Shapes
      </button>

      {!canAnalyze && (
        <p className="text-[10px] text-zinc-600">Set industry on the Project step first.</p>
      )}

      {analysis.data && recommendations.length > 0 && (
        <>
          <p className="text-[10px] text-zinc-500">
            Selected {selectedIds.length} shape{selectedIds.length === 1 ? '' : 's'}
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
                    <span className="text-[10px] font-medium truncate">{rec.name}</span>
                    <span className="text-[10px] text-zinc-500">{rec.score}/10</span>
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
            Apply shapes to brief
          </button>

          {primitives && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                {expanded ? 'Hide' : 'Show'} primitive library ({(primitives as Primitive[]).length})
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
                        <p className="text-[9px] text-zinc-500 truncate">{p.name}</p>
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

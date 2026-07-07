import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { analyzeGeometry, getPrimitives } from '../api';
import { useAppStore } from '../store';
import { ApplyToPromptsButton } from '../components/ApplyToPromptsButton';
import { IndustrySelect } from '../components/IndustrySelect';

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

export function GeometryPage() {
  const applyGeometry = useAppStore((s) => s.applyGeometry);
  const [industry, setIndustry] = useState('Technology');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const addToSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeFromSelection = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
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

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Geometry Intelligence</h1>
        <p className="text-sm text-zinc-500">Primitive library and construction recommendations</p>
      </header>

      <div className="flex gap-3 mb-8 items-start">
        <IndustrySelect value={industry} onChange={setIndustry} className="flex-1" />
        <button
          type="button"
          onClick={() => analysis.mutate()}
          disabled={!industry.trim() || analysis.isPending}
          className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium flex items-center gap-2"
        >
          {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
          Analyze
        </button>
      </div>

      {analysis.data && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 gap-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-400">Recommendations</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Selected {selectedIds.length} shape{selectedIds.length === 1 ? '' : 's'} for apply
              </p>
            </div>
            <ApplyToPromptsButton
              disabled={selectedIds.length === 0}
              onApply={handleApply}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {recommendations.map((rec) => {
              const isSelected = selectedIds.includes(rec.primitiveId);
              return (
                <div
                  key={rec.primitiveId}
                  className={clsx(
                    'relative p-4 rounded-xl border transition-colors',
                    isSelected
                      ? 'bg-zinc-900 border-emerald-700/50 ring-1 ring-emerald-600/30'
                      : 'bg-zinc-900/40 border-zinc-800 opacity-60',
                  )}
                >
                  {isSelected ? (
                    <button
                      type="button"
                      onClick={() => removeFromSelection(rec.primitiveId)}
                      className="absolute top-2 right-2 p-1 rounded-md bg-zinc-800 hover:bg-red-900/60 text-zinc-400 hover:text-red-300"
                      aria-label={`Remove ${rec.name}`}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToSelection(rec.primitiveId)}
                      className="absolute top-2 right-2 p-1 rounded-md bg-zinc-800 hover:bg-emerald-900/60 text-zinc-400 hover:text-emerald-300"
                      aria-label={`Add ${rec.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <h3 className="text-sm font-medium">{rec.name}</h3>
                    <span className="text-xs text-zinc-500">{rec.score}/10</span>
                  </div>
                  <svg viewBox="0 0 100 100" className="w-full h-20 mb-2 stroke-zinc-300 fill-none">
                    <path d={rec.svgPreview} strokeWidth="2" />
                  </svg>
                  <p className="text-xs text-zinc-500">{rec.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analysis.data && primitives && (
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-1">
            Primitive Library ({(primitives as Primitive[]).length})
          </h2>
          <p className="text-xs text-zinc-500 mb-3">Add shapes to selection before applying</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(primitives as Primitive[]).map((p) => {
              const isSelected = selectedIds.includes(p.id);
              const inRecommendations = recById.has(p.id);
              return (
                <div
                  key={p.id}
                  className={clsx(
                    'relative p-3 rounded-xl border text-center transition-colors',
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-800/50 ring-1 ring-emerald-600/20'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700',
                  )}
                >
                  {isSelected ? (
                    <button
                      type="button"
                      onClick={() => removeFromSelection(p.id)}
                      className="absolute top-1.5 right-1.5 p-0.5 rounded bg-zinc-800 hover:bg-red-900/60 text-zinc-400 hover:text-red-300"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToSelection(p.id)}
                      className="absolute top-1.5 right-1.5 p-0.5 rounded bg-zinc-800 hover:bg-emerald-900/60 text-zinc-400 hover:text-emerald-300"
                      aria-label={`Add ${p.name}`}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                  <svg viewBox="0 0 100 100" className="w-full h-14 stroke-zinc-400 fill-none mb-1">
                    <path d={p.svgPath} strokeWidth="2" />
                  </svg>
                  <p className="text-xs text-zinc-400">{p.name}</p>
                  {inRecommendations && !isSelected && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">in recommendations</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

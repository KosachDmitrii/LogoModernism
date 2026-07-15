import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { getPrimitives } from '../../api';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';

interface Primitive {
  id: string;
  name: string;
  svgPath: string;
}

export function BriefShapesSection({ onStepComplete }: { onStepComplete?: () => void }) {
  const t = useT();
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const applyGeometry = useAppStore((s) => s.applyGeometry);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const initializedSelection = useRef(false);

  const { data: primitives } = useQuery({
    queryKey: ['primitives'],
    queryFn: ({ signal }) => getPrimitives(signal),
  });

  useEffect(() => {
    if (initializedSelection.current || !primitives) return;
    initializedSelection.current = true;
    const selectedNames = new Set(
      (designBrief.selectedShapes ?? []).map((shape) => shape.trim().toLowerCase()),
    );
    setSelectedIds(
      (primitives as Primitive[])
        .filter((primitive) => selectedNames.has(primitive.name.trim().toLowerCase()))
        .map((primitive) => primitive.id),
    );
  }, [designBrief.selectedShapes, primitives]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    if (!primitives || selectedIds.length === 0) return;

    const selectedSet = new Set(selectedIds);
    const selectedRecommendations = (primitives as Primitive[])
      .filter((primitive) => selectedSet.has(primitive.id))
      .map((primitive) => ({
        name: primitive.name,
        reason: t('brief.shapes.addedFromLibrary'),
      }));

    applyGeometry(industry, {
      selectedRecommendations,
    });
    onStepComplete?.();
  };

  const primitiveCount = (primitives as Primitive[] | undefined)?.length ?? 0;

  return (
    <div className="space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
      {primitives && (
        <>
          <p className="text-xs text-zinc-500">
            {selectedIds.length === 1
              ? t('brief.shapes.selectedCount', { count: selectedIds.length })
              : t('brief.shapes.selectedCountPlural', { count: selectedIds.length })}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(primitives as Primitive[]).map((primitive) => {
              const isSelected = selectedIds.includes(primitive.id);
              return (
                <button
                  key={primitive.id}
                  type="button"
                  onClick={() => toggleSelection(primitive.id)}
                  className={clsx(
                    'relative p-2 rounded-lg border text-center transition-colors',
                    isSelected
                      ? 'bg-zinc-900 border-emerald-700/50'
                      : 'bg-zinc-950/40 border-zinc-800 opacity-60',
                  )}
                >
                  <span className="block text-xs font-medium truncate pr-4">{primitive.name}</span>
                  <svg viewBox="0 0 100 100" className="w-full h-10 stroke-zinc-300 fill-none">
                    <path d={primitive.svgPath} strokeWidth="2" />
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
          <p className="text-xs text-zinc-600">
            {t('brief.shapes.primitiveLibrary', { count: primitiveCount })}
          </p>
        </>
      )}
    </div>
  );
}

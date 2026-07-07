import { useAppStore } from '../store';
import type { DesignBrief } from '../types';
import { getEraSourceLabel } from '../lib/brief-mappers';

const BRIEF_FIELDS: Array<{ key: keyof DesignBrief; label: string; rows?: number }> = [
  { key: 'personality', label: 'Personality' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'primaryEmotion', label: 'Primary Emotion' },
  { key: 'narrative', label: 'Narrative', rows: 3 },
  { key: 'geometry', label: 'Geometry (через запятую)' },
  { key: 'construction', label: 'Construction (через запятую)' },
  { key: 'preferredShapes', label: 'Preferred Shapes' },
  { key: 'composition', label: 'Composition' },
  { key: 'typography', label: 'Typography' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'knowledgeInsights', label: 'Knowledge Graph', rows: 2 },
  { key: 'bestPromptHint', label: 'Best Prompt Hint', rows: 3 },
  { key: 'critiqueNote', label: 'Critique' },
];

export function DesignBriefPanel() {
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const clearDesignBrief = useAppStore((s) => s.clearDesignBrief);

  if (designBrief.sources.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center">
        <p className="text-xs text-zinc-500">
          Запустите Brand DNA, Geometry или Full Pipeline и нажмите{' '}
          <span className="text-zinc-400">Применить в Prompts</span>
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-400">Design Brief</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {designBrief.sources.map((source) => (
              <span
                key={source}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={clearDesignBrief}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Очистить
        </button>
      </div>

      {designBrief.era.trim() && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">Era:</span>{' '}
          {designBrief.era}
          <span className="text-zinc-500"> ({getEraSourceLabel(designBrief)})</span>
        </p>
      )}

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {BRIEF_FIELDS.map(({ key, label, rows }) => (
          <div key={key}>
            <label className="block text-[10px] font-medium text-zinc-500 mb-1">{label}</label>
            {rows ? (
              <textarea
                value={designBrief[key]}
                onChange={(e) => updateDesignBrief({ [key]: e.target.value })}
                rows={rows}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none"
              />
            ) : (
              <input
                value={designBrief[key]}
                onChange={(e) => updateDesignBrief({ [key]: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

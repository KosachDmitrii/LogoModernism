import { useAppStore } from '../store';
import type { DesignBrief } from '../types';
import { getEraSourceLabel } from '../lib/brief-mappers';

const COLOR_OPTIONS: Array<{ value: DesignBrief['colorPalette']; label: string }> = [
  { value: '', label: 'Auto (from rules)' },
  { value: 'auto', label: 'Auto explicit' },
  { value: 'black_white', label: 'Black & white only' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'two_color', label: 'Two-color max' },
  { value: 'multi_color', label: 'Multi-color controlled' },
  { value: 'corporate_blue', label: 'Corporate blue' },
  { value: 'red_accent', label: 'Red accent' },
  { value: 'limited', label: 'Limited palette' },
  { value: 'custom', label: 'Custom selected colors' },
];

type TextBriefField = {
  [K in keyof DesignBrief]: DesignBrief[K] extends string ? K : never;
}[keyof DesignBrief];

const BRIEF_FIELDS: Array<{ key: TextBriefField; label: string; rows?: number }> = [
  { key: 'personality', label: 'Personality' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'primaryEmotion', label: 'Primary Emotion' },
  { key: 'narrative', label: 'Narrative', rows: 3 },
  { key: 'geometry', label: 'Geometry (comma-separated)' },
  { key: 'construction', label: 'Construction (comma-separated)' },
  { key: 'preferredShapes', label: 'Preferred Shapes' },
  { key: 'composition', label: 'Composition' },
  { key: 'typography', label: 'Typography' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'clientNotes', label: 'Client preferences / details', rows: 3 },
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
          Brief is empty. Go to the <span className="text-zinc-400">Build</span> tab and run
          Quick brief or Typography / Shapes.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-400">Brief summary</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Editable before generation</p>
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
          Clear
        </button>
      </div>

      {designBrief.era.trim() && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">Era:</span>{' '}
          {designBrief.era}
          <span className="text-zinc-500"> ({getEraSourceLabel(designBrief)})</span>
        </p>
      )}

      {designBrief.markType && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">Mark type:</span> {designBrief.markType}
        </p>
      )}

      {designBrief.typographyStyle && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">Typography style:</span> {designBrief.typographyStyle}
        </p>
      )}

      <div>
        <label className="block text-[10px] font-medium text-zinc-500 mb-1">Color palette</label>
        <select
          value={designBrief.colorPalette}
          onChange={(e) =>
            updateDesignBrief({
              colorPalette: e.target.value as DesignBrief['colorPalette'],
            })
          }
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {(designBrief.colorSelections.length > 0 || designBrief.allowShadows || designBrief.allowPhotoreal) && (
        <div className="space-y-1">
          {designBrief.colorSelections.length > 0 && (
            <p className="text-xs text-zinc-300">
              <span className="text-zinc-500">Selected colors:</span>{' '}
              {designBrief.colorSelections.join(', ')}
            </p>
          )}
          {(designBrief.allowShadows || designBrief.allowPhotoreal) && (
            <p className="text-xs text-zinc-300">
              <span className="text-zinc-500">Effects allowed:</span>{' '}
              {[designBrief.allowShadows ? 'shadows' : '', designBrief.allowPhotoreal ? 'photoreal' : '']
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      {(designBrief.catalogReferenceIds?.length ?? 0) > 0 && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">Catalog refs:</span>{' '}
          {designBrief.catalogReferenceIds.length}
        </p>
      )}

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
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

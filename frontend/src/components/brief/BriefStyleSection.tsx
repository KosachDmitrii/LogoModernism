import { useAppStore } from '../../store';
import type { DesignBrief } from '../../types';

const COLOR_OPTIONS: Array<{ value: DesignBrief['colorPalette']; label: string }> = [
  { value: '', label: 'Auto (from rules)' },
  { value: 'black_white', label: 'Black & white only' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'two_color', label: 'Two-color max' },
  { value: 'multi_color', label: 'Multi-color controlled' },
  { value: 'corporate_blue', label: 'Corporate blue' },
  { value: 'red_accent', label: 'Red accent' },
  { value: 'limited', label: 'Limited palette' },
  { value: 'custom', label: 'Custom selected colors' },
];

const COLOR_SWATCHES = [
  'black',
  'white',
  'warm white',
  'charcoal',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'brown',
  'gold',
];

export function BriefStyleSection() {
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);

  const toggleColor = (color: string) => {
    const selected = new Set(designBrief.colorSelections);
    if (selected.has(color)) {
      selected.delete(color);
    } else {
      selected.add(color);
    }
    updateDesignBrief({
      colorSelections: [...selected],
      colorPalette: selected.size > 0 ? designBrief.colorPalette || 'custom' : designBrief.colorPalette,
    });
  };

  return (
    <div className="space-y-4">
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

      <div>
        <p className="text-[10px] font-medium text-zinc-500 mb-2">Selected colors</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_SWATCHES.map((color) => {
            const active = designBrief.colorSelections.includes(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`px-2 py-1 rounded-full border text-[10px] capitalize ${
                  active
                    ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={designBrief.allowShadows}
            onChange={(e) => updateDesignBrief({ allowShadows: e.target.checked })}
            className="accent-emerald-500"
          />
          Allow shadows
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={designBrief.allowPhotoreal}
            onChange={(e) => updateDesignBrief({ allowPhotoreal: e.target.checked })}
            className="accent-emerald-500"
          />
          Allow photoreal
        </label>
      </div>

      {(designBrief.allowShadows || designBrief.allowPhotoreal || designBrief.colorSelections.length > 1) && (
        <p className="text-[10px] text-amber-300/80 leading-relaxed">
          Explicit client choices weaken conflicting modernist anti-patterns for this generation.
        </p>
      )}

      <div>
        <label className="block text-[10px] font-medium text-zinc-500 mb-1">
          Client preferences / details
        </label>
        <textarea
          value={designBrief.clientNotes}
          onChange={(e) => updateDesignBrief({ clientNotes: e.target.value })}
          rows={3}
          placeholder="Examples: avoid forks, softer geometry, make it more premium, use green and gold..."
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none"
        />
      </div>
    </div>
  );
}

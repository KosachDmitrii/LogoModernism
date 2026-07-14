import clsx from 'clsx';
import { Plus, X } from 'lucide-react';
import type { DesignBrief } from '../../types';
import { defaultPaletteColors, paletteColorSlotCount, paletteNeedsColorSelections, resolveColorSelections } from '@logo-platform/shared';
import { useT } from '../../i18n';

const PRESET_SWATCHES = [
  { labelKey: 'brief.style.colorBlack' as const, value: '#000000' },
  { labelKey: 'brief.style.colorWhite' as const, value: '#FFFFFF' },
  { labelKey: 'brief.style.colorRed' as const, value: '#E63946' },
  { labelKey: 'brief.style.colorNavy' as const, value: '#1D3557' },
  { labelKey: 'brief.style.colorYellow' as const, value: '#F5C518' },
  { labelKey: 'brief.style.colorTeal' as const, value: '#2A9D8F' },
];

interface BriefColorSelectionsProps {
  palette: DesignBrief['colorPalette'];
  selections: string[];
  onChange: (selections: string[]) => void;
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return trimmed;
}

export function BriefColorSelections({ palette, selections, onChange }: BriefColorSelectionsProps) {
  const t = useT();

  if (!paletteNeedsColorSelections(palette)) return null;

  const { min, max } = paletteColorSlotCount(palette);
  const slots = resolveColorSelections(palette, selections);
  const displaySlots = slots.length >= min ? slots : [...slots, ...defaultPaletteColors(palette)].slice(0, min);

  const updateSlot = (index: number, value: string) => {
    const next = [...displaySlots];
    next[index] = normalizeHex(value);
    onChange(next.filter(Boolean).slice(0, max));
  };

  const addSlot = () => {
    if (displaySlots.length >= max) return;
    onChange([...displaySlots, '#E63946'].slice(0, max));
  };

  const removeSlot = (index: number) => {
    if (displaySlots.length <= min) return;
    onChange(displaySlots.filter((_, i) => i !== index));
  };

  const applyPreset = (index: number, value: string) => updateSlot(index, value);

  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">{t('brief.style.pickColors')}</p>
        <p className="text-[11px] text-zinc-600">
          {slots.length}/{max}
        </p>
      </div>

      <div className="space-y-2">
        {displaySlots.map((color, index) => (
          <div key={`color-slot-${index}`} className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#000000'}
              onChange={(e) => updateSlot(index, e.target.value)}
              className="h-8 w-10 rounded border border-zinc-700 bg-zinc-900 p-0.5 cursor-pointer"
              aria-label={t('brief.style.colorSlot', { index: index + 1 })}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => updateSlot(index, e.target.value)}
              placeholder="#000000"
              className="flex-1 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
            />
            {slots.length > min && (
              <button
                type="button"
                onClick={() => removeSlot(index)}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                aria-label={t('brief.style.removeColor')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {displaySlots.length < max && (
        <button
          type="button"
          onClick={addSlot}
          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
        >
          <Plus size={12} />
          {t('brief.style.addColor')}
        </button>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {PRESET_SWATCHES.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            title={t(swatch.labelKey)}
            onClick={() => {
              const emptyIndex = displaySlots.findIndex((c) => !c.trim());
              const targetIndex = emptyIndex >= 0 ? emptyIndex : Math.min(displaySlots.length - 1, max - 1);
              applyPreset(targetIndex, swatch.value);
            }}
            className={clsx(
              'h-6 w-6 rounded-full border border-zinc-700 hover:scale-105 transition-transform',
              swatch.value === '#FFFFFF' && 'ring-1 ring-zinc-600',
            )}
            style={{ backgroundColor: swatch.value }}
          />
        ))}
      </div>

      {displaySlots.length < min && (
        <p className="text-[11px] text-amber-400/90">{t('brief.style.pickColorsHint', { count: min })}</p>
      )}
    </div>
  );
}

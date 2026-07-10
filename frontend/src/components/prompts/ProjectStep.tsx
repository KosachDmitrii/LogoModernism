import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store';
import { IndustrySelect } from '../IndustrySelect';
import { eraToInspiration } from '../../lib/brief-mappers';

const INSPIRATION_MODES = [
  { value: '', label: 'None' },
  { value: 'swiss', label: 'Swiss' },
  { value: 'bauhaus', label: 'Bauhaus' },
  { value: 'ibm', label: 'IBM Principles' },
  { value: 'nasa', label: 'NASA Principles' },
  { value: 'lufthansa', label: 'Lufthansa' },
  { value: 'braun', label: 'Braun' },
  { value: 'cbs', label: 'CBS' },
  { value: 'abc', label: 'ABC' },
  { value: 'olivetti', label: 'Olivetti' },
  { value: 'westinghouse', label: 'Westinghouse' },
];

const ERA_OPTIONS = [
  { value: '', label: 'Auto (from analysis)' },
  { value: 'swiss', label: 'Swiss International Style' },
  { value: 'bauhaus', label: 'Bauhaus' },
  { value: 'international_style', label: 'International Typographic Style' },
  { value: 'corporate_identity', label: 'Corporate Identity (1960s)' },
  { value: '1960s', label: '1960s Modernism' },
  { value: '1970s', label: '1970s Systematic Design' },
  { value: 'mid_century', label: 'Mid-Century Modern' },
];

interface ProjectStepProps {
  onContinue: () => void;
}

export function ProjectStep({ onContinue }: ProjectStepProps) {
  const {
    industry,
    companyName,
    variationCount,
    inspirationMode,
    preferredEra,
    minimalismLevel,
    setIndustry,
    setCompanyName,
    setVariationCount,
    setInspirationMode,
    setPreferredEra,
    setMinimalismLevel,
  } = useAppStore();

  const designBrief = useAppStore((s) => s.designBrief);
  const hasDesignBrief = designBrief.sources.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (industry.trim()) onContinue();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-zinc-500">
        Set industry and generation parameters. Next you can enrich the brief (optional).
      </p>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Industry / Business</label>
        <IndustrySelect value={industry} onChange={setIndustry} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company Name (optional)</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Acme Labs — leave empty for symbol-only logos"
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-sm placeholder:text-zinc-600"
        />
      </div>

      {!hasDesignBrief && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Era / Movement</label>
            <select
              value={preferredEra}
              onChange={(e) => setPreferredEra(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
            >
              {ERA_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Inspiration</label>
            <select
              value={inspirationMode}
              onChange={(e) => setInspirationMode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
            >
              {INSPIRATION_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {hasDesignBrief && (
        <p className="text-[11px] text-emerald-400/80 px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
          Era and Inspiration come from your Brief ({designBrief.sources.join(', ')}).
          {designBrief.era.trim() && (
            <span className="block mt-1 text-emerald-300/90">
              Era: {designBrief.era}
              {eraToInspiration(designBrief.era) && (
                <> · Inspiration: {INSPIRATION_MODES.find((m) => m.value === eraToInspiration(designBrief.era))?.label ?? eraToInspiration(designBrief.era)}</>
              )}
            </span>
          )}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Variations</label>
        <select
          value={variationCount}
          onChange={(e) => setVariationCount(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
        >
          {[1].map((n) => (
            <option key={n} value={n}>
              {`${n} ${n === 1 ? "prompt" : "prompts"}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          Minimalism Level: {minimalismLevel}
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={minimalismLevel}
          onChange={(e) => setMinimalismLevel(Number(e.target.value))}
          className="w-full accent-zinc-400"
        />
      </div>

      <button
        type="submit"
        disabled={!industry.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Continue to Brief
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

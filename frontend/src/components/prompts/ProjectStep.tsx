import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore } from '../../store';
import { IndustrySelect } from '../IndustrySelect';
import { CustomSelect } from '../CustomSelect';
import { eraToInspiration } from '../../lib/brief-mappers';
import { PromptCountPicker } from './PromptCountPicker';
import { useT, type MessageKey } from '../../i18n';

const INSPIRATION_MODES: Array<{ value: string; labelKey: MessageKey }> = [
  { value: '', labelKey: 'prompts.inspiration.none' },
  { value: 'swiss', labelKey: 'prompts.inspiration.swiss' },
  { value: 'bauhaus', labelKey: 'prompts.inspiration.bauhaus' },
  { value: 'ibm', labelKey: 'prompts.inspiration.ibm' },
  { value: 'nasa', labelKey: 'prompts.inspiration.nasa' },
  { value: 'lufthansa', labelKey: 'prompts.inspiration.lufthansa' },
  { value: 'braun', labelKey: 'prompts.inspiration.braun' },
  { value: 'cbs', labelKey: 'prompts.inspiration.cbs' },
  { value: 'abc', labelKey: 'prompts.inspiration.abc' },
  { value: 'olivetti', labelKey: 'prompts.inspiration.olivetti' },
  { value: 'westinghouse', labelKey: 'prompts.inspiration.westinghouse' },
];

const ERA_OPTIONS: Array<{ value: string; labelKey: MessageKey }> = [
  { value: '', labelKey: 'prompts.era.autoFromAnalysis' },
  { value: 'swiss', labelKey: 'prompts.era.swissInternational' },
  { value: 'bauhaus', labelKey: 'prompts.era.bauhaus' },
  { value: 'international_style', labelKey: 'prompts.era.internationalTypographic' },
  { value: 'corporate_identity', labelKey: 'prompts.era.corporateIdentity' },
  { value: '1960s', labelKey: 'prompts.era.1960s' },
  { value: '1970s', labelKey: 'prompts.era.1970s' },
  { value: 'mid_century', labelKey: 'prompts.era.midCentury' },
];

interface ProjectStepProps {
  onContinue: () => void;
}

export function ProjectStep({ onContinue }: ProjectStepProps) {
  const t = useT();
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

  const inspirationFromEra = eraToInspiration(designBrief.era);
  const inspirationLabel = inspirationFromEra
    ? INSPIRATION_MODES.find((m) => m.value === inspirationFromEra)?.labelKey
    : undefined;

  const eraSelectOptions = useMemo(
    () => ERA_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  const inspirationSelectOptions = useMemo(
    () => INSPIRATION_MODES.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-zinc-500">{t('prompts.project.intro')}</p>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('prompts.project.industryLabel')}
        </label>
        <IndustrySelect value={industry} onChange={setIndustry} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('prompts.project.companyLabel')}
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={t('prompts.project.companyPlaceholder')}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-sm placeholder:text-zinc-600"
        />
      </div>

      {!hasDesignBrief && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              {t('prompts.project.eraLabel')}
            </label>
            <CustomSelect
              value={preferredEra}
              onChange={setPreferredEra}
              options={eraSelectOptions}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              {t('prompts.project.inspirationLabel')}
            </label>
            <CustomSelect
              value={inspirationMode}
              onChange={setInspirationMode}
              options={inspirationSelectOptions}
            />
          </div>
        </div>
      )}

      {hasDesignBrief && (
        <p className="text-[13px] text-emerald-400/80 px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
          {t('prompts.project.briefOverridesEra', { sources: designBrief.sources.join(', ') })}
          {designBrief.era.trim() && (
            <span className="block mt-1 text-emerald-300/90">
              {t('prompts.project.briefEraLine', { era: designBrief.era })}
              {inspirationLabel && (
                <> · {t('prompts.project.briefInspirationLine', { inspiration: t(inspirationLabel) })}</>
              )}
            </span>
          )}
        </p>
      )}

      <PromptCountPicker value={variationCount} onChange={setVariationCount} />

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('prompts.project.minimalismLabel', { level: minimalismLevel })}
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
        {t('prompts.project.continueToBrief')}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}

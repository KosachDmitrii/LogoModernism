import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { generatePrompts, getRecommendations, getPrinciplesOverview, getImageProviders } from '../api';
import { useAppStore } from '../store';
import { DesignBriefPanel } from './DesignBriefPanel';
import { IndustrySelect } from './IndustrySelect';
import { buildEffectiveIndustry, parseEraFromBrief } from '../lib/brief-mappers';

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

export function InputPanel() {
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
    setResults,
  } = useAppStore();

  const designBrief = useAppStore((s) => s.designBrief);
  const hasDesignBrief = designBrief.sources.length > 0;

  const { data: overview } = useQuery({
    queryKey: ['principles-overview'],
    queryFn: getPrinciplesOverview,
  });

  const { data: imageProviders } = useQuery({
    queryKey: ['image-providers'],
    queryFn: getImageProviders,
  });

  const openaiAvailable = imageProviders?.providers.find((p) => p.id === 'openai')?.available;

  const { data: recommendations, isFetching: loadingRecs } = useQuery({
    queryKey: ['recommendations', industry],
    queryFn: () => getRecommendations(industry),
    enabled: industry.length >= 3,
  });

  const generate = useMutation({
    mutationFn: () => {
      const era = hasDesignBrief
        ? parseEraFromBrief(designBrief.era)
        : parseEraFromBrief(preferredEra) ?? parseEraFromBrief(designBrief.era);
      const principleIds = designBrief.principleIds ?? [];
      const analysisPrincipleIds = principleIds.length > 0 ? principleIds : undefined;
      const catalogIds = designBrief.catalogReferenceIds ?? [];
      const catalogReferenceIds = catalogIds.length > 0 ? catalogIds : undefined;

      return generatePrompts({
        industry: buildEffectiveIndustry(industry, designBrief),
        companyName: companyName || undefined,
        variationCount,
        inspirationMode: hasDesignBrief ? undefined : inspirationMode || undefined,
        minimalismLevel,
        preferredEra: era,
        analysisPrincipleIds,
        catalogReferenceIds,
        catalogNarrative: catalogReferenceIds ? designBrief.narrative || undefined : undefined,
      });
    },
    onSuccess: (data) => setResults(data.prompts, data.recommendations),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry.trim() || generate.isPending) return;
    generate.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Logo Modernism</h1>
        <p className="text-sm text-zinc-500">
          Design principles engine · {overview?.total ?? '…'} rules in knowledge base
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          Images: {openaiAvailable ? 'OpenAI' : 'Mock preview (add OPENAI_API_KEY)'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Industry / Business
          </label>
          <IndustrySelect value={industry} onChange={setIndustry} />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Company Name (optional)
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Labs"
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

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Variations</label>
          <select
            value={variationCount}
            onChange={(e) => setVariationCount(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} prompts
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
          disabled={!industry.trim() || generate.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {generate.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Compose Prompts
        </button>
      </form>

      <DesignBriefPanel />

      {recommendations && industry.length >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800"
        >
          <p className="text-xs font-medium text-zinc-400 mb-2">
            {loadingRecs ? 'Analyzing…' : 'AI Recommendations'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendations.recommendations.map((r) => (
              <span
                key={r.principleId}
                className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300"
              >
                {r.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {generate.isError && (
        <p className="text-xs text-red-400">
          {generate.error instanceof Error
            ? generate.error.message
            : 'Failed to generate. Make sure the API is running on port 3001.'}
        </p>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Dna } from 'lucide-react';
import { analyzeBrandDNA } from '../api';
import { useAppStore } from '../store';
import { ApplyToPromptsButton } from '../components/ApplyToPromptsButton';
import { IndustrySelect } from '../components/IndustrySelect';

export function BrandDNAPage() {
  const applyBrandDNA = useAppStore((s) => s.applyBrandDNA);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  const analysis = useMutation({
    mutationFn: () => analyzeBrandDNA({ companyName, industry }),
  });

  const result = analysis.data;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <Dna size={22} /> Brand DNA Engine
        </h1>
        <p className="text-sm text-zinc-500">Extract visual identity DNA from brand context</p>
      </header>

      <div className="space-y-4 mb-8">
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company name"
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
        />
        <IndustrySelect value={industry} onChange={setIndustry} />
        <button
          type="button"
          disabled={!companyName || !industry || analysis.isPending}
          onClick={() => analysis.mutate()}
          className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium disabled:opacity-40 flex items-center gap-2"
        >
          {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
          Analyze Brand DNA
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ApplyToPromptsButton
              onApply={() => applyBrandDNA(companyName, industry, result)}
            />
          </div>
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Narrative</h3>
            <p className="text-sm text-zinc-400">{result.narrative}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoCard title="Personality" value={result.personality} />
            <InfoCard title="Era" value={result.visualTraits.era.replace(/_/g, ' ')} />
            <InfoCard title="Complexity" value={result.visualTraits.complexity} />
            <InfoCard title="Primary Emotion" value={result.psychologyProfile.primaryEmotion} />
          </div>
          <TagSection title="Geometry" tags={result.visualTraits.geometry} />
          <TagSection title="Construction" tags={result.visualTraits.construction} />
          <TagSection title="Constraints" tags={result.constraints} />
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-1">{title}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function TagSection({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">{t}</span>
        ))}
      </div>
    </div>
  );
}

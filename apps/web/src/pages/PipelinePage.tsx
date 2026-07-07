import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Workflow } from 'lucide-react';
import { runFullPipeline } from '../api';
import { useAppStore } from '../store';
import { ApplyToPromptsButton } from '../components/ApplyToPromptsButton';

export function PipelinePage() {
  const applyPipeline = useAppStore((s) => s.applyPipeline);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  const pipeline = useMutation({
    mutationFn: () => runFullPipeline({ companyName, industry, variationCount: 3 }),
  });

  const result = pipeline.data;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <Workflow size={22} /> Full Pipeline
        </h1>
        <p className="text-sm text-zinc-500">Orchestrate all AI engines in sequence</p>
      </header>

      <div className="flex gap-3 mb-8">
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name"
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none" />
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry"
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none" />
        <button type="button" onClick={() => pipeline.mutate()} disabled={!companyName || !industry || pipeline.isPending}
          className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium flex items-center gap-2">
          {pipeline.isPending && <Loader2 size={14} className="animate-spin" />}
          Run Pipeline
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ApplyToPromptsButton
              onApply={() => applyPipeline(companyName, industry, result)}
            />
          </div>
          <StageCard title="Brand DNA" content={result.brandDNA.narrative} />
          <StageCard title="Typography" content={`${result.typography.primaryRecommendation.name} (${result.typography.primaryRecommendation.score}/10)`} />
          <StageCard title="Composition" content={result.composition.recommendedLayout.name} />
          <StageCard title="Best Prompt" content={result.prompts.bestPrompt.text} />
          <StageCard title="Critique Score" content={`${result.critique.overallScore}/10 — Grade: ${result.critique.modernismGrade}`} />
          {result.svgBlueprint && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">SVG Blueprint</h3>
              <div className="bg-white rounded-lg p-4" dangerouslySetInnerHTML={{ __html: result.svgBlueprint.svg }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StageCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <h3 className="text-xs font-medium text-zinc-500 mb-1">{title}</h3>
      <p className="text-sm text-zinc-300">{content}</p>
    </div>
  );
}

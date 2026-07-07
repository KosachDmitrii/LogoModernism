import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { reverseAnalyze } from '../api';

export function CriticPage() {
  const [description, setDescription] = useState('');

  const analysis = useMutation({
    mutationFn: () => reverseAnalyze({ description }),
  });

  const result = analysis.data;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Reverse Analysis & Critic</h1>
        <p className="text-sm text-zinc-500">Analyze existing logos and estimate design DNA</p>
      </header>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe a logo: geometric circle mark with negative space, Swiss style, minimal two-color…"
        rows={4}
        className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none mb-4 resize-none"
      />
      <button type="button" onClick={() => analysis.mutate()} disabled={!description || analysis.isPending}
        className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium flex items-center gap-2">
        {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
        Analyze Logo
      </button>

      {result && (
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Modernism" value={`${result.modernismScore}/10`} />
            <Metric label="Era" value={result.eraEstimate} />
            <Metric label="Complexity" value={result.complexityEstimate} />
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-xs text-zinc-500 mb-2">Construction Hypothesis</h3>
            <ul className="text-sm text-zinc-300 space-y-1">
              {result.constructionHypothesis.map((h: string) => <li key={h}>• {h}</li>)}
            </ul>
          </div>
          {result.matchedReferences.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-xs text-zinc-500 mb-2">Similar References</h3>
              {result.matchedReferences.map((ref: { id: string; name: string; similarity: number }) => (
                <div key={ref.id} className="flex justify-between text-sm py-1">
                  <span>{ref.name}</span>
                  <span className="text-zinc-500">{Math.round(ref.similarity * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

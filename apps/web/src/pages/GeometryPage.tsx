import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { analyzeGeometry, getPrimitives } from '../api';
import { useAppStore } from '../store';
import { ApplyToPromptsButton } from '../components/ApplyToPromptsButton';

export function GeometryPage() {
  const applyGeometry = useAppStore((s) => s.applyGeometry);
  const [industry, setIndustry] = useState('tech');

  const { data: primitives } = useQuery({ queryKey: ['primitives'], queryFn: getPrimitives });

  const analysis = useMutation({
    mutationFn: () => analyzeGeometry({ industry, complexity: 'minimal' }),
  });

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Geometry Intelligence</h1>
        <p className="text-sm text-zinc-500">Primitive library and construction recommendations</p>
      </header>

      <div className="flex gap-3 mb-8">
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="Industry"
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={() => analysis.mutate()}
          disabled={analysis.isPending}
          className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium flex items-center gap-2"
        >
          {analysis.isPending && <Loader2 size={14} className="animate-spin" />}
          Analyze
        </button>
      </div>

      {analysis.data && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400">Recommendations</h2>
            <ApplyToPromptsButton
              onApply={() => applyGeometry(industry, analysis.data)}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {analysis.data.recommendations.map((rec: { primitiveId: string; name: string; score: number; svgPreview: string; reason: string }) => (
              <div key={rec.primitiveId} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium">{rec.name}</h3>
                  <span className="text-xs text-zinc-500">{rec.score}/10</span>
                </div>
                <svg viewBox="0 0 100 100" className="w-full h-20 mb-2 stroke-zinc-300 fill-none">
                  <path d={rec.svgPreview} strokeWidth="2" />
                </svg>
                <p className="text-xs text-zinc-500">{rec.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {primitives && (
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Primitive Library ({primitives.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {primitives.map((p: { id: string; name: string; svgPath: string }) => (
              <div key={p.id} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <svg viewBox="0 0 100 100" className="w-full h-14 stroke-zinc-400 fill-none mb-1">
                  <path d={p.svgPath} strokeWidth="2" />
                </svg>
                <p className="text-xs text-zinc-400">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

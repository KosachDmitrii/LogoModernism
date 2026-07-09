import { useMutation } from '@tanstack/react-query';
import { Loader2, Wand2 } from 'lucide-react';
import { runFullPipeline } from '../../api';
import { useAppStore } from '../../store';

export function AutoBriefButton() {
  const companyName = useAppStore((s) => s.companyName);
  const industry = useAppStore((s) => s.industry);
  const applyPipeline = useAppStore((s) => s.applyPipeline);

  const brandName = companyName.trim();
  const symbolOnly = !brandName;

  const pipeline = useMutation({
    mutationFn: () =>
      runFullPipeline({
        companyName: brandName,
        industry,
        variationCount: 3,
      }),
    onSuccess: (result) => {
      applyPipeline(brandName, industry, result);
    },
  });

  const canRun = Boolean(industry.trim());
  const result = pipeline.data;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => pipeline.mutate()}
        disabled={!canRun || pipeline.isPending}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium disabled:opacity-40 transition-colors"
      >
        {pipeline.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Wand2 size={14} />
        )}
        {symbolOnly ? 'Run Quick Brief (Symbol Only)' : 'Run Quick Brief'}
      </button>
      <p className="text-[10px] text-center text-zinc-500">
        {symbolOnly
          ? 'No Company Name set: will build a symbol-only brief'
          : 'Will use Company Name for brand-aware analysis'}
      </p>
      {result && (
        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
          <p className="text-[10px] text-emerald-300">
            Brief updated · score {result.critique.overallScore}/10
          </p>
        </div>
      )}
      {pipeline.isError && (
        <p className="text-[10px] text-red-400">Auto Brief failed. Check API connection.</p>
      )}
    </div>
  );
}

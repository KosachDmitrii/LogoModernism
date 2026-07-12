import { useMutation } from '@tanstack/react-query';
import { Loader2, Wand2 } from 'lucide-react';
import { runFullPipeline } from '../../api';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { formatError } from '../../lib/api-error';

export function AutoBriefButton() {
  const t = useT();
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
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Wand2 size={16} />
        )}
        {symbolOnly ? t('brief.autoBrief.runSymbolOnly') : t('brief.autoBrief.run')}
      </button>
      <p className="text-xs text-center text-zinc-500">
        {symbolOnly ? t('brief.autoBrief.symbolOnlyHint') : t('brief.autoBrief.withNameHint')}
      </p>
      {result && (
        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
          <p className="text-xs text-emerald-300">
            {t('brief.autoBrief.updated', { score: result.critique.overallScore })}
          </p>
        </div>
      )}
      {pipeline.isError && (
        <p className="text-xs text-red-400">{formatError(pipeline.error, t)}</p>
      )}
    </div>
  );
}

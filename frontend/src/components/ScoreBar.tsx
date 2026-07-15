import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ScoreBarProps {
  label: string;
  hint?: string;
  value: number;
  max?: number;
}

export function ScoreBar({ label, hint, value, max = 10 }: ScoreBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    value >= 8 ? 'bg-emerald-500' : value >= 6 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-4 text-xs">
        <div className="min-w-0">
          <span className="text-zinc-400">{label}</span>
          {hint && <p className="mt-0.5 text-[11px] leading-4 text-zinc-600">{hint}</p>}
        </div>
        <span className="shrink-0 font-mono text-zinc-300">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className={clsx('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

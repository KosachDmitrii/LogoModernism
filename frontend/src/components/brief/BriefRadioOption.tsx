import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Radio } from '@base-ui/react/radio';

interface BriefRadioOptionProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
}

export function BriefRadioOption({
  name,
  value,
  checked,
  onChange,
  children,
  className,
}: BriefRadioOptionProps) {
  return (
    <label
      className={clsx(
        'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors',
        checked
          ? 'border-violet-500/40 bg-violet-500/5'
          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700',
        className,
      )}
    >
      <Radio.Root
        value={value}
        aria-label={`${name}-${value}`}
        onClick={onChange}
        className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-zinc-600 data-checked:border-violet-400"
      >
        <Radio.Indicator className="h-1.5 w-1.5 rounded-full bg-violet-400" />
      </Radio.Root>
      <span className="text-xs text-zinc-300 leading-relaxed min-w-0">{children}</span>
    </label>
  );
}

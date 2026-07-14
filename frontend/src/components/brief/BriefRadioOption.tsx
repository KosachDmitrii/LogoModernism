import clsx from 'clsx';
import type { ReactNode } from 'react';

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
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="brief-radio mt-0.5"
      />
      <span className="text-xs text-zinc-300 leading-relaxed min-w-0">{children}</span>
    </label>
  );
}

import clsx from 'clsx';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { PromptCountOption } from '../../types';
import { useT } from '../../i18n';

const PROMPT_COUNT_OPTIONS: PromptCountOption[] = [1, 3, 5];

interface PromptCountPickerProps {
  value: number;
  onChange: (count: PromptCountOption) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function normalizePromptCount(value: number): PromptCountOption {
  if (value <= 1) return 1;
  if (value <= 3) return 3;
  return 5;
}

export function PromptCountPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: PromptCountPickerProps) {
  const t = useT();
  const normalized = normalizePromptCount(value);

  const hintKey =
    normalized === 1
      ? 'prompts.count.hintOne'
      : normalized === 3
        ? 'prompts.count.hintThree'
        : 'prompts.count.hintFive';

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <label className="block text-xs font-medium text-zinc-400">
        {t('prompts.count.label')}
      </label>
      <ToggleGroup
        value={[String(normalized)]}
        onValueChange={(values) => {
          const next = Number(values[0]);
          if (PROMPT_COUNT_OPTIONS.includes(next as PromptCountOption)) {
            onChange(next as PromptCountOption);
          }
        }}
        disabled={disabled}
        aria-label={t('prompts.count.label')}
        className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800"
      >
        {PROMPT_COUNT_OPTIONS.map((count) => (
          <Toggle
            key={count}
            value={String(count)}
            className={clsx(
              'flex-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-40',
              compact ? 'py-2' : 'py-2.5',
              normalized === count
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60',
            )}
          >
            {count}
          </Toggle>
        ))}
      </ToggleGroup>
      <p className="text-xs text-zinc-600 leading-relaxed">{t(hintKey)}</p>
    </div>
  );
}

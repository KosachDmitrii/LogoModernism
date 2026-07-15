import clsx from 'clsx';
import { useT } from '../../i18n';
import { Button } from '../ui/Button';

interface StartOverButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'ghost' | 'primary';
}

export function StartOverButton({ onClick, disabled, variant = 'ghost' }: StartOverButtonProps) {
  const t = useT();

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'px-3 py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary'
          ? 'flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white'
          : 'text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-zinc-800 shrink-0',
      )}
    >
      {t('prompts.startOver.button')}
    </Button>
  );
}

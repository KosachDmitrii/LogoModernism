import { useT } from '../../i18n';

interface StartOverButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function StartOverButton({ onClick, disabled }: StartOverButtonProps) {
  const t = useT();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-3.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-zinc-800 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {t('prompts.startOver.button')}
    </button>
  );
}

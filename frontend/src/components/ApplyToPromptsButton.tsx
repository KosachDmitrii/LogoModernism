import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '../i18n';

interface ApplyToPromptsButtonProps {
  disabled?: boolean;
  onApply: () => boolean | void;
}

export function ApplyToPromptsButton({ disabled, onApply }: ApplyToPromptsButtonProps) {
  const t = useT();
  const navigate = useNavigate();

  const handleClick = () => {
    const applied = onApply();
    if (applied !== false) {
      navigate('/prompts');
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
    >
      {t('brief.applyToBrief')}
      <ArrowRight size={16} />
    </button>
  );
}

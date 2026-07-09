import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ApplyToPromptsButtonProps {
  disabled?: boolean;
  onApply: () => void;
}

export function ApplyToPromptsButton({ disabled, onApply }: ApplyToPromptsButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    onApply();
    navigate('/prompts');
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
    >
      Apply to Brief
      <ArrowRight size={14} />
    </button>
  );
}

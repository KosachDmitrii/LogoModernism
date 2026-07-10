import { RotateCcw } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

interface StartOverDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StartOverDialog({ open, onConfirm, onCancel }: StartOverDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Start over?"
      description="This clears your current session: industry, company name, design brief, and generated prompts. Saved favorites and Brain feedback are kept."
      confirmLabel="Start over"
      cancelLabel="Keep working"
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      icon={<RotateCcw size={18} />}
    />
  );
}

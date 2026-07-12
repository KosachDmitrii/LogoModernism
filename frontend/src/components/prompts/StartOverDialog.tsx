import { RotateCcw } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { useT } from '../../i18n';

interface StartOverDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StartOverDialog({ open, onConfirm, onCancel }: StartOverDialogProps) {
  const t = useT();

  return (
    <ConfirmDialog
      open={open}
      title={t('prompts.startOver.title')}
      description={t('prompts.startOver.description')}
      confirmLabel={t('prompts.startOver.confirm')}
      cancelLabel={t('prompts.startOver.cancel')}
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      icon={<RotateCcw size={20} />}
    />
  );
}

import { AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { useT } from '../../i18n';

interface LowReadinessDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LowReadinessDialog({ open, onConfirm, onCancel }: LowReadinessDialogProps) {
  const t = useT();

  return (
    <ConfirmDialog
      open={open}
      title={t('brief.lowReadiness.title')}
      description={t('brief.lowReadiness.description')}
      confirmLabel={t('brief.lowReadiness.confirm')}
      cancelLabel={t('brief.lowReadiness.cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
      icon={<AlertTriangle size={20} className="text-amber-400" />}
    />
  );
}

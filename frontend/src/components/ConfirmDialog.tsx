import { useRef, type ReactNode } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useT } from '../i18n';
import { Button } from './ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  icon,
  tone = 'default',
}: ConfirmDialogProps) {
  const t = useT();
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          onClick={onCancel}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[2px]"
        />
        <AlertDialog.Viewport
          onClick={(event) => {
            if (event.target === event.currentTarget) onCancel();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <AlertDialog.Popup
            initialFocus={confirmRef}
            className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                {icon && (
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                    {icon}
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-0.5">
                  <AlertDialog.Title className="text-base font-medium text-zinc-100">
                    {title}
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    {description}
                  </AlertDialog.Description>
                </div>
                <AlertDialog.Close
                  type="button"
                  aria-label={t('common.closeDialog')}
                  className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
                >
                  <X size={18} />
                </AlertDialog.Close>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/30 rounded-b-2xl">
              <AlertDialog.Close
                type="button"
                className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition-colors"
              >
                {resolvedCancelLabel}
              </AlertDialog.Close>
              <Button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={clsx(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  tone === 'danger'
                    ? 'bg-red-950/60 text-red-200 border border-red-900/60 hover:bg-red-950 hover:border-red-800'
                    : 'bg-zinc-100 text-zinc-900 hover:bg-white',
                )}
              >
                {resolvedConfirmLabel}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

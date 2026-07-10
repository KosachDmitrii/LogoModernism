import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  icon,
  tone = 'default',
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
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
              <h2 id={titleId} className="text-base font-medium text-zinc-100">
                {title}
              </h2>
              <p id={descriptionId} className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/30 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

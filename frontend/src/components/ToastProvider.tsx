import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import clsx from 'clsx';
import { useT } from '../i18n';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export type ToastInput = {
  tone?: ToastTone;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastApi = {
  show: (toast: ToastInput) => string;
  success: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) => string;
  error: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) => string;
  warning: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) => string;
  info: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const MAX_VISIBLE_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    const toast: ToastRecord = {
      ...input,
      id,
      tone: input.tone ?? 'info',
    };
    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE_TOASTS));
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show({ ...options, message, tone: 'success' }),
      error: (message, options) => show({ ...options, message, tone: 'error' }),
      warning: (message, options) => show({ ...options, message, tone: 'warning' }),
      info: (message, options) => show({ ...options, message, tone: 'info' }),
      dismiss,
      dismissAll: () => setToasts([]),
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:w-[24rem]"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const t = useT();
  const [paused, setPaused] = useState(false);
  const duration = toast.duration ?? (toast.tone === 'error' ? 7_000 : 4_000);

  useEffect(() => {
    if (paused || duration <= 0) return undefined;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss, paused, toast.id]);

  const icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: TriangleAlert,
    info: Info,
  }[toast.tone];
  const Icon = icon;
  const defaultTitle = {
    success: t('toast.success'),
    error: t('toast.error'),
    warning: t('toast.warning'),
    info: t('toast.info'),
  }[toast.tone];

  return (
    <section
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={clsx(
        'toast-card pointer-events-auto w-full rounded-xl border p-4 shadow-2xl backdrop-blur-md',
        `toast-card-${toast.tone}`,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={19} className="toast-icon mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">{toast.title ?? defaultTitle}</p>
          <p className="mt-1 text-sm leading-5 text-zinc-400">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-3 text-xs font-semibold text-violet-400 hover:text-violet-300"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label={t('toast.dismiss')}
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X size={15} />
        </button>
      </div>
    </section>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

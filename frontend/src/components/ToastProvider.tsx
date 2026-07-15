import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { Toast } from '@base-ui/react/toast';
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

type ToastData = {
  tone: ToastTone;
  action?: ToastInput['action'];
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
  return (
    <Toast.Provider limit={MAX_VISIBLE_TOASTS}>
      <ToastProviderContent>{children}</ToastProviderContent>
    </Toast.Provider>
  );
}

function ToastProviderContent({ children }: { children: ReactNode }) {
  const toastManager = Toast.useToastManager<ToastData>();
  const dismiss = useCallback((id: string) => {
    toastManager.close(id);
  }, [toastManager]);

  const show = useCallback((input: ToastInput) => {
    const tone = input.tone ?? 'info';
    return toastManager.add({
      title: input.title,
      description: input.message,
      type: tone,
      priority: tone === 'error' ? 'high' : 'low',
      timeout: input.duration ?? (tone === 'error' ? 7_000 : 4_000),
      data: { tone, action: input.action },
    });
  }, [toastManager]);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show({ ...options, message, tone: 'success' }),
      error: (message, options) => show({ ...options, message, tone: 'error' }),
      warning: (message, options) => show({ ...options, message, tone: 'warning' }),
      info: (message, options) => show({ ...options, message, tone: 'info' }),
      dismiss,
      dismissAll: () => toastManager.close(),
    }),
    [dismiss, show, toastManager],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toast.Portal>
        <Toast.Viewport
          className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:w-[24rem]"
        >
          {toastManager.toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </Toast.Viewport>
      </Toast.Portal>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast.Root.ToastObject<ToastData>;
  onDismiss: (id: string) => void;
}) {
  const t = useT();
  const tone = toast.data?.tone ?? 'info';

  const icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: TriangleAlert,
    info: Info,
  }[tone];
  const Icon = icon;
  const defaultTitle = {
    success: t('toast.success'),
    error: t('toast.error'),
    warning: t('toast.warning'),
    info: t('toast.info'),
  }[tone];

  return (
    <Toast.Root
      toast={toast}
      className={clsx(
        'toast-card pointer-events-auto w-full rounded-xl border p-4 shadow-2xl backdrop-blur-md',
        `toast-card-${tone}`,
      )}
    >
      <Toast.Content>
      <div className="flex items-start gap-3">
        <Icon size={19} className="toast-icon mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-sm font-semibold text-zinc-100">{toast.title ?? defaultTitle}</Toast.Title>
          <Toast.Description className="mt-1 text-sm leading-5 text-zinc-400">{toast.description}</Toast.Description>
          {toast.data?.action && (
            <Toast.Action
              type="button"
              onClick={() => {
                toast.data?.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-3 text-xs font-semibold text-violet-400 hover:text-violet-300"
            >
              {toast.data.action.label}
            </Toast.Action>
          )}
        </div>
        <Toast.Close
          type="button"
          aria-label={t('toast.dismiss')}
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X size={15} />
        </Toast.Close>
      </div>
      </Toast.Content>
    </Toast.Root>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

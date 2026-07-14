import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useT, type MessageKey } from '../../i18n';
import { useThemeStore } from '../../theme/theme-store';

export type PromptWizardStep = 1 | 2 | 3;

const STEPS: Array<{ n: PromptWizardStep; labelKey: MessageKey }> = [
  { n: 1, labelKey: 'prompts.step.project' },
  { n: 2, labelKey: 'prompts.step.brief' },
  { n: 3, labelKey: 'prompts.step.prompts' },
];

interface PromptStepProgressProps {
  activeStep: PromptWizardStep;
  canGoToStep: (step: PromptWizardStep) => boolean;
}

function Step({
  step,
  label,
  reachable,
  isActive,
  isComplete,
  isLight,
}: {
  step: (typeof STEPS)[number];
  label: string;
  reachable: boolean;
  isActive: boolean;
  isComplete: boolean;
  isLight: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 shrink-0 min-w-[4.5rem]"
      aria-current={isActive ? 'step' : undefined}
    >
      <div
        className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all',
          isActive &&
            (isLight
              ? 'border-2 border-zinc-900 text-zinc-900 bg-white scale-105'
              : 'bg-violet-600 text-white ring-2 ring-violet-500/50 shadow-md shadow-violet-500/25 scale-105'),
          !isActive &&
            isComplete &&
            (isLight
              ? 'border-2 border-zinc-400 text-zinc-600 bg-zinc-100'
              : 'bg-violet-900/40 text-violet-300 border border-violet-500/35'),
          !isActive &&
            !isComplete &&
            reachable &&
            'border-2 border-zinc-600 text-zinc-400 bg-transparent',
          !isActive &&
            !isComplete &&
            !reachable &&
            'border-2 border-dashed border-zinc-700 text-zinc-600 bg-zinc-900/20',
        )}
      >
        {isComplete ? <Check size={16} strokeWidth={2.5} aria-hidden /> : step.n}
      </div>
      <span
        className={clsx(
          'text-sm whitespace-nowrap transition-colors',
          isActive && (isLight ? 'text-zinc-900 font-semibold' : 'text-violet-400 font-semibold'),
          !isActive && isComplete && 'text-zinc-400 font-medium',
          !isActive && !isComplete && reachable && 'text-zinc-500',
          !isActive && !isComplete && !reachable && 'text-zinc-600',
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function PromptStepProgress({ activeStep, canGoToStep }: PromptStepProgressProps) {
  const t = useT();
  const isLight = useThemeStore((s) => s.theme) === 'light';

  return (
    <nav aria-label={t('prompts.step.navLabel')} className="flex w-full items-start">
      {STEPS.map((step, i) => {
        const reachable = canGoToStep(step.n);
        const isActive = activeStep === step.n;
        const isComplete = activeStep > step.n;
        const connectorComplete = activeStep > step.n;

        return (
          <div key={step.n} className="contents">
            <Step
              step={step}
              label={t(step.labelKey)}
              reachable={reachable}
              isActive={isActive}
              isComplete={isComplete}
              isLight={isLight}
            />
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-1 mt-[1.125rem] min-w-8 rounded-full transition-colors',
                  connectorComplete
                    ? isLight
                      ? 'bg-zinc-400'
                      : 'bg-violet-500/55'
                    : 'bg-zinc-800',
                )}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

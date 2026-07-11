import clsx from 'clsx';
import { useT, type MessageKey } from '../../i18n';

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
}: {
  step: (typeof STEPS)[number];
  label: string;
  reachable: boolean;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-2 shrink-0 group min-w-[4.5rem]',
        reachable ? 'cursor-default' : 'cursor-default',
      )}
    >
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
          isActive
            ? 'bg-zinc-100 text-zinc-900'
            : isComplete
              ? 'bg-zinc-700 text-zinc-200 group-hover:bg-zinc-600'
              : reachable
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
                : 'bg-zinc-900 text-zinc-600',
        )}
      >
        {step.n}
      </div>
      <span
        className={clsx(
          'text-sm whitespace-nowrap transition-colors',
          isActive
            ? 'text-zinc-100 font-medium'
            : isComplete
              ? 'text-zinc-400 group-hover:text-zinc-300'
              : reachable
                ? 'text-zinc-500 group-hover:text-zinc-400'
                : 'text-zinc-600',
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function PromptStepProgress({ activeStep, canGoToStep }: PromptStepProgressProps) {
  const t = useT();

  return (
    <div className="flex w-full items-start">
      {STEPS.map((step, i) => {
        const reachable = canGoToStep(step.n);
        const isActive = activeStep === step.n;
        const isComplete = activeStep > step.n;

        return (
          <div key={step.n} className="contents">
            <Step
              step={step}
              label={t(step.labelKey)}
              reachable={reachable}
              isActive={isActive}
              isComplete={isComplete}
            />
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-zinc-800 mx-0 mt-4 min-w-8" />}
          </div>
        );
      })}
    </div>
  );
}

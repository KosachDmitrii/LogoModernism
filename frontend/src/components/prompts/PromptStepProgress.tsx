import clsx from 'clsx';

export type PromptWizardStep = 1 | 2 | 3;

const STEPS: Array<{ n: PromptWizardStep; label: string }> = [
  { n: 1, label: 'Project' },
  { n: 2, label: 'Brief' },
  { n: 3, label: 'Prompts' },
];

interface PromptStepProgressProps {
  activeStep: PromptWizardStep;
  canGoToStep: (step: PromptWizardStep) => boolean;
  onStepClick: (step: PromptWizardStep) => void;
}

function StepButton({
  step,
  reachable,
  isActive,
  isComplete,
  onClick,
}: {
  step: (typeof STEPS)[number];
  reachable: boolean;
  isActive: boolean;
  isComplete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!reachable}
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-2 shrink-0 group min-w-[4.5rem]',
        reachable ? 'cursor-pointer' : 'cursor-default',
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
        {step.label}
      </span>
    </button>
  );
}

export function PromptStepProgress({ activeStep, canGoToStep, onStepClick }: PromptStepProgressProps) {
  return (
    <div className="flex w-full items-start">
      {STEPS.map((step, i) => {
        const reachable = canGoToStep(step.n);
        const isActive = activeStep === step.n;
        const isComplete = activeStep > step.n;

        return (
          <div key={step.n} className="contents">
            <StepButton
              step={step}
              reachable={reachable}
              isActive={isActive}
              isComplete={isComplete}
              onClick={() => reachable && onStepClick(step.n)}
            />
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-zinc-800 mx-0 mt-4 min-w-8" />}
          </div>
        );
      })}
    </div>
  );
}

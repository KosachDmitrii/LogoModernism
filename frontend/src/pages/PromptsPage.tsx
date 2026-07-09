import { useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { PromptCard } from '../components/PromptCard';
import { BriefWorkflowPanel } from '../components/brief/BriefWorkflowPanel';
import { ProjectStep } from '../components/prompts/ProjectStep';
import {
  PromptStepProgress,
  type PromptWizardStep,
} from '../components/prompts/PromptStepProgress';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useComposePrompts } from '../hooks/useComposePrompts';
import { useAppStore } from '../store';

const STEP_META: Record<PromptWizardStep, { title: string; subtitle: string }> = {
  1: {
    title: 'Project',
    subtitle: 'Industry, company name, and generation settings.',
  },
  2: {
    title: 'Brief',
    subtitle: 'Optional — build a design brief for better prompts.',
  },
  3: {
    title: 'Results',
    subtitle: 'Review, copy, generate logos, and give feedback.',
  },
};

export function PromptsPage() {
  const prompts = useAppStore((s) => s.prompts);
  const industry = useAppStore((s) => s.industry);
  const selectedPromptId = useAppStore((s) => s.selectedPromptId);
  const selectPrompt = useAppStore((s) => s.selectPrompt);

  const [activeStep, setActiveStep] = useState<PromptWizardStep>(prompts.length > 0 ? 3 : 1);

  const compose = useComposePrompts();

  const canGoToStep = (step: PromptWizardStep) => {
    if (step === 1) return true;
    if (step === 2) return Boolean(industry.trim());
    if (step === 3) return prompts.length > 0;
    return false;
  };

  const handleCompose = () => {
    if (!industry.trim() || compose.isPending) return;
    compose.mutate(undefined, {
      onSuccess: () => setActiveStep(3),
    });
  };

  const meta = STEP_META[activeStep];

  return (
    <PageContainer>
      <PageHeader
        page="prompts"
        subtitle={meta.subtitle}
      />

      <div className="mb-8">
        <PromptStepProgress
          activeStep={activeStep}
          canGoToStep={canGoToStep}
          onStepClick={setActiveStep}
        />
      </div>

      {activeStep === 3 ? (
        <div>
          {prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-zinc-800">
              <p className="text-sm text-zinc-500 mb-4">No prompts yet.</p>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Go to Brief to compose →
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full">
              <p className="text-sm text-zinc-400 mb-4">{prompts.length} prompts ranked by quality</p>
              <div className="space-y-4">
                {prompts.map((prompt, i) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    rank={i + 1}
                    selected={selectedPromptId === prompt.id}
                    onSelect={() => selectPrompt(prompt.id)}
                  />
                ))}
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-zinc-800 transition-colors shrink-0"
                >
                  <ArrowLeft size={14} />
                  Back to Brief
                </button>
                <button
                  type="button"
                  onClick={handleCompose}
                  disabled={compose.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
                >
                  {compose.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Regenerate prompts
                </button>
              </div>
            </div>
          )}

          {compose.isError && (
            <p className="text-xs text-red-400 mt-4 text-center">
              {compose.error instanceof Error ? compose.error.message : 'Generation failed'}
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto w-full">
          {activeStep === 1 ? (
            <ProjectStep onContinue={() => setActiveStep(2)} />
          ) : (
            <BriefWorkflowPanel
              onCompose={handleCompose}
              onBack={() => setActiveStep(1)}
              isComposing={compose.isPending}
              canCompose={Boolean(industry.trim())}
            />
          )}

          {compose.isError && activeStep === 2 && (
            <p className="text-xs text-red-400 mt-4">
              {compose.error instanceof Error ? compose.error.message : 'Generation failed'}
            </p>
          )}
        </div>
      )}
    </PageContainer>
  );
}

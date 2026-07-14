import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PromptCard } from '../components/PromptCard';
import { BriefWorkflowPanel } from '../components/brief/BriefWorkflowPanel';
import { ProjectStep } from '../components/prompts/ProjectStep';
import {
  PromptStepProgress,
  type PromptWizardStep,
} from '../components/prompts/PromptStepProgress';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { useComposePrompts, type ComposePromptsOptions } from '../hooks/useComposePrompts';
import { useAppStore } from '../store';
import { StartOverButton } from '../components/prompts/StartOverButton';
import { StartOverDialog } from '../components/prompts/StartOverDialog';
import { LowReadinessDialog } from '../components/prompts/LowReadinessDialog';
import { BrainPartnerPanel, type PartnerRegenerateAction } from '../components/prompts/BrainPartnerPanel';
import { applyConstraintResolutions } from '../lib/apply-constraint-resolution';
import type { ConstraintResolution } from '../types';
import { useT, type MessageKey } from '../i18n';
import { formatError } from '../lib/api-error';
import { readPromptsWizardReturnStep, resolveInitialPromptsWizardStep } from '../lib/brief-navigation';
import { getBriefReadiness } from '../lib/brief-readiness';
import { toPromptGenerateIntent } from '../lib/prompt-generate-intent';

const STEP_SUBTITLE_KEYS: Record<PromptWizardStep, MessageKey> = {
  1: 'prompts.step.projectSubtitle',
  2: 'prompts.step.briefSubtitle',
  3: 'prompts.step.resultsSubtitle',
};

export function PromptsPage() {
  const t = useT();
  const prompts = useAppStore((s) => s.prompts);
  const brainPartner = useAppStore((s) => s.brainPartner);
  const industry = useAppStore((s) => s.industry);
  const designBrief = useAppStore((s) => s.designBrief);
  const selectedPromptId = useAppStore((s) => s.selectedPromptId);
  const selectPrompt = useAppStore((s) => s.selectPrompt);
  const resetWizard = useAppStore((s) => s.resetWizard);

  const [activeStep, setActiveStep] = useState<PromptWizardStep>(() => {
    const industryValue = useAppStore.getState().industry;
    const returnStep = readPromptsWizardReturnStep();
    if (returnStep != null) {
      if (returnStep === 2 && !industryValue.trim()) return 1;
      return returnStep;
    }
    return resolveInitialPromptsWizardStep(industryValue);
  });
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [lowReadinessOpen, setLowReadinessOpen] = useState(false);
  const [pendingCompose, setPendingCompose] = useState<{
    options?: ComposePromptsOptions;
    action?: PartnerRegenerateAction;
  } | null>(null);
  const [regeneratingAction, setRegeneratingAction] = useState<PartnerRegenerateAction | null>(null);

  const compose = useComposePrompts();

  const canGoToStep = (step: PromptWizardStep) => {
    if (step === 1) return true;
    if (step === 2) return Boolean(industry.trim());
    if (step === 3) return prompts.length > 0;
    return false;
  };

  const runCompose = (
    options?: ComposePromptsOptions,
    action?: PartnerRegenerateAction,
  ) => {
    if (!industry.trim() || compose.isPending) return;
    if (action) setRegeneratingAction(action);
    compose.mutate(
      { ...options, intent: options?.intent ?? toPromptGenerateIntent(action) },
      {
        onSuccess: () => setActiveStep(3),
        onSettled: () => setRegeneratingAction(null),
      },
    );
  };

  const handleCompose = (
    options?: ComposePromptsOptions,
    action?: PartnerRegenerateAction,
  ) => {
    if (!industry.trim() || compose.isPending) return;
    const readiness = getBriefReadiness(designBrief);
    if (designBrief.sources.length > 0 && readiness.score < 50) {
      setPendingCompose({ options, action });
      setLowReadinessOpen(true);
      return;
    }
    runCompose(options, action);
  };

  const confirmLowReadiness = () => {
    if (pendingCompose) {
      runCompose(pendingCompose.options, pendingCompose.action);
    }
    setPendingCompose(null);
    setLowReadinessOpen(false);
  };

  const cancelLowReadiness = () => {
    setPendingCompose(null);
    setLowReadinessOpen(false);
  };

  const handleStartOver = () => setStartOverOpen(true);

  const confirmStartOver = () => {
    resetWizard();
    setActiveStep(1);
    setStartOverOpen(false);
  };

  const handleResolveConflicts = (resolutions: ConstraintResolution[]) => {
    if (!industry.trim() || compose.isPending || resolutions.length === 0) return;

    const { brief, composeOptions } = applyConstraintResolutions(designBrief, resolutions);
    const options: ComposePromptsOptions = {
      ...composeOptions,
      briefOverride: brief,
      intent: 'resolve-conflicts',
    };

    setRegeneratingAction('resolve-conflict');
    compose.mutate(options, {
      onSuccess: () => setActiveStep(3),
      onSettled: () => setRegeneratingAction(null),
    });
  };

  return (
    <>
      <PageContainer>
      <PageHeader
        page="prompts"
        subtitle={t(STEP_SUBTITLE_KEYS[activeStep])}
      />

      <div className="mb-8">
        <PromptStepProgress
          activeStep={activeStep}
          canGoToStep={canGoToStep}
        />
      </div>

      {activeStep === 3 ? (
        <div>
          {prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-zinc-800">
              <p className="text-sm text-zinc-500 mb-4">{t('prompts.results.empty')}</p>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                {t('prompts.results.goToBrief')}
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full">
              {brainPartner && (
                <BrainPartnerPanel
                  partner={brainPartner}
                  regeneratingAction={compose.isPending ? regeneratingAction : null}
                  onApplyTerritory={(territoryId) =>
                    handleCompose({ preferredTerritoryId: territoryId }, 'apply')
                  }
                  onRegenerateAuto={() => handleCompose(undefined, 're-pick')}
                  onNewVariations={() =>
                    handleCompose(
                      {
                        preferredTerritoryId:
                          brainPartner.selectedTerritoryId as ComposePromptsOptions['preferredTerritoryId'],
                      },
                      'new-variations',
                    )
                  }
                  onResolveConflicts={handleResolveConflicts}
                />
              )}
              <p className="text-sm text-zinc-400 mb-4">
                {t('prompts.results.rankedCount', { count: prompts.length })}
              </p>
              <div id="prompt-results" className="space-y-4 scroll-mt-6">
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
                  className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-zinc-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  {t('prompts.results.backToBrief')}
                </button>
                <StartOverButton onClick={handleStartOver} disabled={compose.isPending} variant="primary" />
              </div>
            </div>
          )}

          {compose.isError && (
            <p className="text-xs text-red-400 mt-4 text-center">
              {formatError(compose.error, t)}
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
              onStartOver={handleStartOver}
              isComposing={compose.isPending}
              canCompose={Boolean(industry.trim())}
            />
          )}

          {compose.isError && activeStep === 2 && (
            <p className="text-xs text-red-400 mt-4">
              {formatError(compose.error, t)}
            </p>
          )}
        </div>
      )}
      </PageContainer>
      <StartOverDialog
        open={startOverOpen}
        onConfirm={confirmStartOver}
        onCancel={() => setStartOverOpen(false)}
      />
      <LowReadinessDialog
        open={lowReadinessOpen}
        onConfirm={confirmLowReadiness}
        onCancel={cancelLowReadiness}
      />
    </>
  );
}

import { useEffect, useState } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import clsx from 'clsx';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Compass,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ConstraintConflictCard } from './ConstraintConflictCard';
import type { BrainPartnerState, ConstraintResolution, CreativeTerritory, CreativeTerritoryId } from '../../types';
import { useT, type MessageKey } from '../../i18n';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';

function formatConstraintScore(score: number): string {
  const percent = score > 1 ? score : score * 100;
  return `${Math.round(percent)}%`;
}

export interface ComposeTerritoryOptions {
  preferredTerritoryId?: CreativeTerritoryId;
}

export type PartnerRegenerateAction = 'new-variations' | 're-pick' | 'apply' | 'resolve-conflict';

interface BrainPartnerPanelProps {
  partner: BrainPartnerState;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  regeneratingAction?: PartnerRegenerateAction | null;
  onApplyTerritory: (territoryId: CreativeTerritoryId) => void;
  onRegenerateAuto: () => void;
  onNewVariations: () => void;
  onResolveConflicts: (resolutions: ConstraintResolution[]) => void;
}

const WORKFLOW_STEPS: Array<{
  titleKey: MessageKey;
  bodyKey: MessageKey;
  target: 'compare' | 'apply' | 'prompts';
}> = [
  {
    titleKey: 'prompts.partner.stepCompareTitle',
    bodyKey: 'prompts.partner.stepCompareBody',
    target: 'compare',
  },
  {
    titleKey: 'prompts.partner.stepApplyTitle',
    bodyKey: 'prompts.partner.stepApplyBody',
    target: 'apply',
  },
  {
    titleKey: 'prompts.partner.stepGenerateTitle',
    bodyKey: 'prompts.partner.stepGenerateBody',
    target: 'prompts',
  },
];

type WorkflowTarget = (typeof WORKFLOW_STEPS)[number]['target'];

const CRITIQUE_DIMENSIONS: Array<{
  key: MessageKey;
  field: 'recognizability' | 'scalability' | 'balance' | 'simplicity' | 'modernity';
}> = [
  { key: 'prompts.partner.recognizability', field: 'recognizability' },
  { key: 'prompts.partner.scalability', field: 'scalability' },
  { key: 'prompts.partner.balance', field: 'balance' },
  { key: 'prompts.partner.simplicity', field: 'simplicity' },
  { key: 'prompts.partner.modernity', field: 'modernity' },
];

function scrollToWorkflowStep(target: WorkflowTarget) {
  const elementId = target === 'prompts' ? 'prompt-results' : `partner-step-${target}`;
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function TerritoryCard({
  territory,
  isActive,
  isViewing,
  onSelect,
}: {
  territory: CreativeTerritory;
  isActive: boolean;
  isViewing: boolean;
  onSelect: () => void;
}) {
  const t = useT();

  return (
    <Tooltip content={territory.thesis}>
    <Button
      type="button"
      onClick={onSelect}
      className={clsx(
        'text-left rounded-lg border p-3 transition-colors w-full',
        isViewing
          ? 'border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-medium text-zinc-200">{territory.name}</p>
        {isActive && (
          <span className="shrink-0 text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('prompts.partner.inPrompts')}
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed cursor-help">
        {territory.thesis}
      </p>
      <p className="text-[11px] text-zinc-600 mt-2">
        {t('prompts.partner.fitScore', { percent: (territory.confidence * 100).toFixed(0) })}
      </p>
    </Button>
    </Tooltip>
  );
}

export function BrainPartnerPanel({
  partner,
  isExpanded,
  onExpandedChange,
  regeneratingAction = null,
  onApplyTerritory,
  onRegenerateAuto,
  onNewVariations,
  onResolveConflicts,
}: BrainPartnerPanelProps) {
  const t = useT();
  const [viewTerritoryId, setViewTerritoryId] = useState(partner.selectedTerritoryId);
  const [selectedResolutionByViolation, setSelectedResolutionByViolation] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setViewTerritoryId(partner.selectedTerritoryId);
  }, [partner.selectedTerritoryId]);

  const viewingTerritory =
    partner.creativeTerritories.find((item) => item.id === viewTerritoryId) ??
    partner.creativeTerritories.find((item) => item.id === partner.selectedTerritoryId);

  const activeTerritoryName =
    partner.creativeTerritories.find((item) => item.id === partner.selectedTerritoryId)?.name ?? '';

  const isViewingActive = viewTerritoryId === partner.selectedTerritoryId;
  const isRegenerating = regeneratingAction !== null;
  const errors = partner.constraintReport.violations.filter((v) => v.severity === 'error');
  const warnings = partner.constraintReport.violations.filter((v) => v.severity === 'warning');
  const conflictViolations = [...errors, ...warnings].filter(
    (violation) => (violation.resolutions?.length ?? 0) > 0,
  );
  const conflictViolationKey = conflictViolations.map((violation) => violation.id).join('|');

  useEffect(() => {
    setSelectedResolutionByViolation((current) => {
      const next: Record<string, string> = {};
      for (const violation of conflictViolations) {
        const resolutions = violation.resolutions ?? [];
        const existing = current[violation.id];
        next[violation.id] = resolutions.some((item) => item.id === existing)
          ? existing
          : (resolutions[0]?.id ?? '');
      }
      return next;
    });
  }, [conflictViolationKey]);

  const selectedResolutions = conflictViolations
    .map((violation) => {
      const selectedId = selectedResolutionByViolation[violation.id];
      return violation.resolutions?.find((item) => item.id === selectedId);
    })
    .filter((resolution): resolution is ConstraintResolution => Boolean(resolution));

  const canApplyAllConflicts =
    conflictViolations.length > 0 &&
    selectedResolutions.length === conflictViolations.length;
  const isApplyingConflicts = regeneratingAction === 'resolve-conflict';

  return (
    <Collapsible.Root
      open={isExpanded}
      onOpenChange={onExpandedChange}
      className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden mb-6"
    >
      <Collapsible.Trigger
        className={clsx(
          'w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:cursor-pointer',
          isExpanded && 'border-b border-zinc-800',
        )}
      >
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <div>
            <p className="text-sm font-medium text-zinc-200">{t('prompts.partner.title')}</p>
            <p className="text-xs text-zinc-500">{t('prompts.partner.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {partner.critique && (
            <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300">
              {t('prompts.partner.critiqueScore', { score: partner.critique.overallScore.toFixed(1) })}
            </span>
          )}
          <ChevronDown
            size={16}
            className={clsx('transition-transform', isExpanded && 'rotate-180')}
          />
        </div>
      </Collapsible.Trigger>

      <Collapsible.Panel>
          <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/30">
        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{t('prompts.partner.howToUse')}</p>
        <ol className="grid gap-2 sm:grid-cols-3">
          {WORKFLOW_STEPS.map((step, index) => (
            <li key={step.target}>
              <Button
                type="button"
                onClick={() => scrollToWorkflowStep(step.target)}
                className="w-full text-left rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-500 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-zinc-400 transition-colors"
              >
                <p className="text-zinc-300 font-medium mb-0.5">
                  {index + 1}. {t(step.titleKey)}
                </p>
                <p className="leading-relaxed">{t(step.bodyKey)}</p>
                <p className="text-[11px] text-violet-400/70 mt-1.5">{t('prompts.partner.jumpToSection')}</p>
              </Button>
            </li>
          ))}
        </ol>
          </div>

          <div className="p-4 space-y-5">
        <section id="partner-step-compare" className="scroll-mt-6">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <Compass size={14} className="text-zinc-500" />
              <p className="text-xs uppercase tracking-wide text-zinc-500">{t('prompts.partner.creativeTerritories')}</p>
            </div>
            <span className="text-[11px] text-zinc-600">
              {partner.territorySelectionMode === 'manual'
                ? t('prompts.partner.youChoseDirection')
                : t('prompts.partner.brainAutoPicked')}
            </span>
          </div>
          <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{t('prompts.partner.territoriesHint')}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {partner.creativeTerritories.map((territory) => (
              <TerritoryCard
                key={territory.id}
                territory={territory}
                isActive={territory.id === partner.selectedTerritoryId}
                isViewing={territory.id === viewTerritoryId}
                onSelect={() => setViewTerritoryId(territory.id)}
              />
            ))}
          </div>

          {viewingTerritory && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-zinc-300 leading-relaxed">{viewingTerritory.thesis}</p>
                <div className="grid gap-1.5 text-xs text-zinc-500">
                  <p>
                    <span className="text-zinc-400">{t('prompts.partner.constructionLabel')}:</span>{' '}
                    {viewingTerritory.constructionFocus}
                  </p>
                  <p>
                    <span className="text-zinc-400">{t('prompts.partner.typographyLabel')}:</span>{' '}
                    {viewingTerritory.typographyFocus}
                  </p>
                  <p>
                    <span className="text-zinc-400">{t('prompts.partner.colorLabel')}:</span>{' '}
                    {viewingTerritory.colorApproach}
                  </p>
                </div>
                {viewingTerritory.tradeoffs.length > 0 && (
                  <ul className="text-xs text-zinc-600 space-y-0.5 pt-1">
                    {viewingTerritory.tradeoffs.map((tradeoff) => (
                      <li key={tradeoff} className="flex gap-1.5">
                        <span className="text-zinc-500">·</span>
                        <span>{tradeoff}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div id="partner-step-apply" className="pt-2 border-t border-zinc-800/80 space-y-2 scroll-mt-6">
                {isViewingActive ? (
                  <>
                    <p className="text-xs text-emerald-400/90 flex items-center gap-1.5">
                      <CheckCircle2 size={11} />
                      {t('prompts.partner.directionApplied')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={isRegenerating}
                        onClick={onNewVariations}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-[13px] font-medium text-white transition-colors"
                      >
                        {regeneratingAction === 'new-variations' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        {t('prompts.partner.newVariations')}
                      </Button>
                      <Button
                        type="button"
                        disabled={isRegenerating}
                        onClick={onRegenerateAuto}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 text-[13px] text-zinc-300 transition-colors"
                      >
                        {regeneratingAction === 're-pick' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : null}
                        {t('prompts.partner.repickDirection')}
                      </Button>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">{t('prompts.partner.variationsHint')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {t('prompts.partner.previewing', {
                        name: viewingTerritory.name,
                        activeName: activeTerritoryName || viewingTerritory.name,
                      })}
                    </p>
                    <Button
                      type="button"
                      disabled={isRegenerating}
                      onClick={() => onApplyTerritory(viewingTerritory.id as CreativeTerritoryId)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-[13px] font-medium text-white transition-colors"
                    >
                      {regeneratingAction === 'apply' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ArrowRight size={14} />
                      )}
                      {t('prompts.partner.generateWithDirection')}
                    </Button>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      {t('prompts.partner.generateWithDirectionHint')}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              {partner.constraintReport.passed ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              <p className="text-xs uppercase tracking-wide text-zinc-500">{t('prompts.partner.constraintGate')}</p>
            </div>
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded-md',
                partner.constraintReport.passed
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400',
              )}
            >
              {partner.constraintReport.passed ? t('prompts.partner.passed') : t('prompts.partner.issuesFound')} ·{' '}
              {formatConstraintScore(partner.constraintReport.score)}
            </span>
          </div>
          <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{t('prompts.partner.constraintGateHint')}</p>

          {partner.constraintReport.violations.length === 0 ? (
            <p className="text-xs text-zinc-500">{t('prompts.partner.constraintsSatisfied')}</p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-3">
                {conflictViolations.map((violation) => (
                  <ConstraintConflictCard
                    key={violation.id}
                    violation={violation}
                    selectedResolutionId={selectedResolutionByViolation[violation.id] ?? ''}
                    onSelectResolution={(resolutionId) =>
                      setSelectedResolutionByViolation((current) => ({
                        ...current,
                        [violation.id]: resolutionId,
                      }))
                    }
                  />
                ))}
              </ul>
              <Button
                type="button"
                disabled={!canApplyAllConflicts || isApplyingConflicts || isRegenerating}
                onClick={() => onResolveConflicts(selectedResolutions)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-[13px] font-medium text-white transition-colors"
              >
                {isApplyingConflicts ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArrowRight size={14} />
                )}
                {t('prompts.conflict.applyAllResolutions')}
              </Button>
            </div>
          )}
        </section>

        {partner.critique && (
          <section>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={14} className="text-zinc-500" />
              <p className="text-xs uppercase tracking-wide text-zinc-500">{t('prompts.partner.critiqueSection')}</p>
            </div>
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{t('prompts.partner.critiqueHint')}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {CRITIQUE_DIMENSIONS.map(({ key, field }) => (
                <span
                  key={field}
                  className="text-[11px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400"
                >
                  {t(key)} {partner.critique![field].toFixed(1)}
                </span>
              ))}
            </div>
            {partner.critique.feedback.length > 0 && (
              <ul className="text-xs text-zinc-500 space-y-1">
                {partner.critique.feedback.slice(0, 4).map((item) => (
                  <li key={item} className="flex gap-1.5">
                    <span>·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section>
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen size={14} className="text-zinc-500" />
            <p className="text-xs uppercase tracking-wide text-zinc-500">{t('prompts.partner.catalogIntelligence')}</p>
            {partner.catalogIntelligence.autoSelected && (
              <span className="text-[11px] text-zinc-600">{t('prompts.partner.autoSelected')}</span>
            )}
          </div>
          <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{t('prompts.partner.catalogIntelligenceHint')}</p>
          {partner.catalogIntelligence.recommendations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {partner.catalogIntelligence.recommendations.slice(0, 5).map((ref) => (
                <Tooltip key={ref.id} content={ref.id}>
                <span
                  className="text-[11px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400"
                >
                  {ref.name}{' '}
                  <span className="text-zinc-600">({(ref.industryScore * 100).toFixed(0)}%)</span>
                </span>
                </Tooltip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">{t('prompts.partner.noCatalogMatches')}</p>
          )}
        </section>
          </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

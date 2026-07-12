import { useState } from 'react';
import { Eye, Hammer, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { getBriefReadiness } from '../../lib/brief-readiness';
import { DesignBriefPanel } from '../DesignBriefPanel';
import { BriefBuildPanel } from './BriefBuildPanel';
import { BriefCoverageMap } from './BriefCoverageMap';
import { BriefChecklist } from './BriefChecklist';
import { StartOverButton } from '../prompts/StartOverButton';
import { useT, type MessageKey } from '../../i18n';

type BriefSubTab = 'build' | 'review';

interface BriefWorkflowPanelProps {
  onCompose: () => void;
  onBack?: () => void;
  onStartOver?: () => void;
  isComposing: boolean;
  canCompose: boolean;
}

export function BriefWorkflowPanel({
  onCompose,
  onBack,
  onStartOver,
  isComposing,
  canCompose,
}: BriefWorkflowPanelProps) {
  const t = useT();
  const designBrief = useAppStore((s) => s.designBrief);
  const readiness = getBriefReadiness(designBrief);
  const [subTab, setSubTab] = useState<BriefSubTab>('build');

  const subTabs: Array<{ id: BriefSubTab; labelKey: MessageKey; descriptionKey: MessageKey; icon: typeof Hammer }> = [
    { id: 'build', labelKey: 'brief.tab.build', descriptionKey: 'brief.tab.buildDescription', icon: Hammer },
    { id: 'review', labelKey: 'brief.tab.review', descriptionKey: 'brief.tab.reviewDescription', icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
        <p className="text-xs text-zinc-400 leading-relaxed">{t('brief.optionalIntro')}</p>
      </div>

      <BriefChecklist />

      <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        {subTabs.map(({ id, labelKey, descriptionKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
              subTab === id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            <span className="flex items-center gap-1.5">
              <Icon size={15} />
              {t(labelKey)}
              {id === 'review' && designBrief.sources.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 text-[11px]">
                  {designBrief.sources.length}
                </span>
              )}
            </span>
            <span className="text-[11px] font-normal text-zinc-600">{t(descriptionKey)}</span>
          </button>
        ))}
      </div>

      {subTab === 'build' ? (
        <BriefBuildPanel
          onGoToReview={() => setSubTab('review')}
          onBack={onBack}
          onStartOver={onStartOver}
        />
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <p className="text-xs font-medium text-zinc-300 mb-1">
              {t('brief.readinessLabel', { label: t(readiness.labelKey) })}{' '}
              <span className="text-zinc-500 font-normal">({readiness.score}%)</span>
            </p>
            {readiness.hintKeys.length > 0 ? (
              <ul className="text-[13px] text-zinc-500 space-y-0.5 mt-2">
                {readiness.hintKeys.map((hintKey) => (
                  <li key={hintKey}>· {t(hintKey)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-emerald-400/80 mt-1">{t('brief.readyToGenerate')}</p>
            )}
          </div>

          <DesignBriefPanel />

          <BriefCoverageMap designBrief={designBrief} />

          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-zinc-800 transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
                {t('brief.backToProject')}
              </button>
            )}
            <button
              type="button"
              onClick={onCompose}
              disabled={!canCompose || isComposing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isComposing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              {t('brief.composePrompts')}
            </button>
            {onStartOver && (
              <StartOverButton onClick={onStartOver} disabled={isComposing} />
            )}
          </div>

          {designBrief.sources.length === 0 && (
            <p className="text-[13px] text-zinc-600 text-center">{t('prompts.results.noBriefYet')}</p>
          )}
        </div>
      )}
    </div>
  );
}

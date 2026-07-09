import { useEffect, useRef, useState } from 'react';
import { Eye, Hammer, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { getBriefReadiness } from '../../lib/brief-readiness';
import { DesignBriefPanel } from '../DesignBriefPanel';
import { BriefBuildPanel } from './BriefBuildPanel';
import { BriefCoverageMap } from './BriefCoverageMap';
import { BriefChecklist } from './BriefChecklist';

type BriefSubTab = 'build' | 'review';

interface BriefWorkflowPanelProps {
  onCompose: () => void;
  onBack?: () => void;
  isComposing: boolean;
  canCompose: boolean;
}

export function BriefWorkflowPanel({ onCompose, onBack, isComposing, canCompose }: BriefWorkflowPanelProps) {
  const designBrief = useAppStore((s) => s.designBrief);
  const readiness = getBriefReadiness(designBrief);
  const [subTab, setSubTab] = useState<BriefSubTab>('build');
  const prevSourceCount = useRef(designBrief.sources.length);

  useEffect(() => {
    if (designBrief.sources.length > prevSourceCount.current) {
      setSubTab('review');
    }
    prevSourceCount.current = designBrief.sources.length;
  }, [designBrief.sources.length]);

  const subTabs: Array<{ id: BriefSubTab; label: string; description: string; icon: typeof Hammer }> = [
    { id: 'build', label: 'Build', description: 'Run analysis & set preferences', icon: Hammer },
    { id: 'review', label: 'Review', description: 'Edit & generate prompts', icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Brief is <span className="text-zinc-300">optional</span> but improves prompt quality.
          Build fills in design decisions; Review lets you edit before generation.
        </p>
      </div>

      <BriefChecklist />

      <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        {subTabs.map(({ id, label, description, icon: Icon }) => (
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
              <Icon size={13} />
              {label}
              {id === 'review' && designBrief.sources.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 text-[9px]">
                  {designBrief.sources.length}
                </span>
              )}
            </span>
            <span className="text-[9px] font-normal text-zinc-600">{description}</span>
          </button>
        ))}
      </div>

      {subTab === 'build' ? (
        <BriefBuildPanel onGoToReview={() => setSubTab('review')} />
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <p className="text-xs font-medium text-zinc-300 mb-1">
              Brief: {readiness.label}{' '}
              <span className="text-zinc-500 font-normal">({readiness.score}%)</span>
            </p>
            {readiness.hints.length > 0 ? (
              <ul className="text-[11px] text-zinc-500 space-y-0.5 mt-2">
                {readiness.hints.map((hint) => (
                  <li key={hint}>· {hint}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-emerald-400/80 mt-1">
                Brief is ready — you can generate prompts
              </p>
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
                <ArrowLeft size={14} />
                Project
              </button>
            )}
            <button
              type="button"
              onClick={onCompose}
              disabled={!canCompose || isComposing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isComposing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Compose Prompts
            </button>
          </div>

          {designBrief.sources.length === 0 && (
            <p className="text-[11px] text-zinc-600 text-center">
              No brief yet — you can still compose using Project settings only, or go to Build first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

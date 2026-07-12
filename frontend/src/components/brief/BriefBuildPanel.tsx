import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  MessageCircle,
  Palette,
  Shapes,
  Sparkles,
  Type,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { BriefTypographySection } from './BriefTypographySection';
import { BriefShapesSection } from './BriefShapesSection';
import { BriefReferencesSection } from './BriefReferencesSection';
import { BriefCoverageMap } from './BriefCoverageMap';
import { BriefStyleSection } from './BriefStyleSection';
import { BriefClientSection } from './BriefClientSection';
import { BriefAnalyzeSection } from './BriefAnalyzeSection';
import { StartOverButton } from '../prompts/StartOverButton';
import { useT, type MessageKey } from '../../i18n';

import {
  advanceBriefBuildSection,
  BUILD_SECTIONS,
  readInitialBuildSection,
  rememberBriefBuildSection,
  type BuildSection,
} from '../../lib/brief-navigation';

export type { BuildSection };
export { advanceBriefBuildSection };

interface BriefBuildPanelProps {
  onGoToReview: () => void;
  onBack?: () => void;
  onStartOver?: () => void;
}

function sectionStatus(
  brief: ReturnType<typeof useAppStore.getState>['designBrief'],
  section: BuildSection,
) {
  if (section === 'typography') {
    const done =
      brief.sources.some((s) => s.includes('Brand DNA') || s.includes('Pipeline')) ||
      Boolean(brief.typography.trim());
    return done ? 'done' : 'pending';
  }
  if (section === 'shapes') {
    const done =
      Boolean(brief.geometry.trim() || brief.preferredShapes.trim()) ||
      brief.sources.includes('Geometry');
    return done ? 'done' : 'pending';
  }
  if (section === 'style') {
    const done =
      Boolean(brief.colorPalette && brief.colorPalette !== 'auto') ||
      brief.sources.includes('Style');
    return done ? 'done' : 'optional';
  }
  if (section === 'client') {
    const done = Boolean(brief.clientNotes.trim()) || brief.sources.includes('Client brief');
    return done ? 'done' : 'optional';
  }
  if (section === 'analyze') {
    const done = brief.sources.includes('Brain interview');
    return done ? 'done' : 'optional';
  }
  const done = (brief.catalogReferenceIds?.length ?? 0) > 0;
  return done ? 'done' : 'optional';
}

export function BriefBuildPanel({ onGoToReview, onBack, onStartOver }: BriefBuildPanelProps) {
  const t = useT();
  const designBrief = useAppStore((s) => s.designBrief);
  const [openSection, setOpenSection] = useState<BuildSection | null>(readInitialBuildSection);

  const goToNext = (current: BuildSection) => {
    const idx = BUILD_SECTIONS.indexOf(current);
    if (idx >= 0 && idx < BUILD_SECTIONS.length - 1) {
      setOpenSection(BUILD_SECTIONS[idx + 1]!);
    }
  };

  useEffect(() => {
    if (openSection) {
      rememberBriefBuildSection(openSection);
    }
  }, [openSection]);

  const toggle = (id: BuildSection) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  const companyName = useAppStore((s) => s.companyName);

  const sections: Array<{
    id: BuildSection;
    step: number;
    labelKey: MessageKey;
    descriptionKey: MessageKey;
    icon: typeof Type;
  }> = [
    {
      id: 'typography',
      step: 1,
      labelKey: 'brief.build.section.typography',
      descriptionKey: companyName.trim()
        ? 'brief.build.section.typographyWithName'
        : 'brief.build.section.typographySymbolOnly',
      icon: Type,
    },
    {
      id: 'shapes',
      step: 2,
      labelKey: 'brief.build.section.shapes',
      descriptionKey: 'brief.build.section.shapesDescription',
      icon: Shapes,
    },
    {
      id: 'style',
      step: 3,
      labelKey: 'brief.build.section.style',
      descriptionKey: 'brief.build.section.styleDescription',
      icon: Palette,
    },
    {
      id: 'references',
      step: 4,
      labelKey: 'brief.build.section.references',
      descriptionKey: 'brief.build.section.referencesDescription',
      icon: BookOpen,
    },
    {
      id: 'client',
      step: 5,
      labelKey: 'brief.build.section.client',
      descriptionKey: 'brief.build.section.clientDescription',
      icon: MessageCircle,
    },
    {
      id: 'analyze',
      step: 6,
      labelKey: 'brief.build.section.analyze',
      descriptionKey: 'brief.build.section.analyzeDescription',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
        <p className="text-[13px] text-zinc-400 leading-relaxed">{t('brief.build.stepsIntro')}</p>
      </div>

      <div className="space-y-2">
        {sections.map(({ id, step, labelKey, descriptionKey, icon: Icon }) => {
          const isOpen = openSection === id;
          const status = sectionStatus(designBrief, id);

          return (
            <div key={id} className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(id)}
                className="w-full flex items-center gap-3 px-3 py-3 bg-zinc-900/60 hover:bg-zinc-900 text-left"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                  {step}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <Icon size={15} className="text-zinc-500 shrink-0" />
                    <span className="text-xs font-medium text-zinc-200">{t(labelKey)}</span>
                    <StatusBadge status={status} />
                  </span>
                  <span className="block text-xs text-zinc-500 mt-0.5 truncate">
                    {t(descriptionKey)}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={clsx('text-zinc-500 shrink-0 transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen && (
                <div className="px-3 py-3 border-t border-zinc-800 bg-zinc-950/40">
                  {id === 'typography' && (
                    <BriefTypographySection onStepComplete={() => goToNext('typography')} />
                  )}
                  {id === 'shapes' && (
                    <BriefShapesSection onStepComplete={() => goToNext('shapes')} />
                  )}
                  {id === 'style' && (
                    <BriefStyleSection onStepComplete={() => goToNext('style')} />
                  )}
                  {id === 'references' && (
                    <BriefReferencesSection onStepComplete={() => goToNext('references')} />
                  )}
                  {id === 'client' && (
                    <BriefClientSection onStepComplete={() => goToNext('client')} />
                  )}
                  {id === 'analyze' && <BriefAnalyzeSection />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BriefCoverageMap designBrief={designBrief} />

      <div className="flex items-center gap-3 pt-2">
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
          onClick={onGoToReview}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white transition-colors"
        >
          {t('brief.build.reviewBrief')}
          <ArrowRight size={16} />
        </button>
        {onStartOver && <StartOverButton onClick={onStartOver} />}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'done' | 'pending' | 'optional' }) {
  const t = useT();

  if (status === 'done') {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">
        {t('brief.build.status.done')}
      </span>
    );
  }
  if (status === 'optional') {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
        {t('common.optional')}
      </span>
    );
  }
  return (
    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
      {t('brief.build.status.pending')}
    </span>
  );
}

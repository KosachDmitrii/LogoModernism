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
import { BriefProjectSummary } from './BriefProjectSummary';
import { BriefCoverageMap } from './BriefCoverageMap';
import { BriefStyleSection } from './BriefStyleSection';
import { BriefClientSection } from './BriefClientSection';
import { BriefAnalyzeSection } from './BriefAnalyzeSection';

export type BuildSection = 'typography' | 'shapes' | 'style' | 'references' | 'client' | 'analyze';

const BUILD_SECTIONS: BuildSection[] = [
  'typography',
  'shapes',
  'style',
  'references',
  'client',
  'analyze',
];

const SECTION_STORAGE_KEY = 'brief-build-section';
const SECTION_ADVANCE_KEY = 'brief-build-advance';

function readInitialSection(): BuildSection {
  const advance = sessionStorage.getItem(SECTION_ADVANCE_KEY);
  if (advance && BUILD_SECTIONS.includes(advance as BuildSection)) {
    sessionStorage.removeItem(SECTION_ADVANCE_KEY);
    return advance as BuildSection;
  }
  const saved = sessionStorage.getItem(SECTION_STORAGE_KEY);
  if (saved && BUILD_SECTIONS.includes(saved as BuildSection)) {
    return saved as BuildSection;
  }
  return 'typography';
}

export function advanceBriefBuildSection(from: BuildSection) {
  const idx = BUILD_SECTIONS.indexOf(from);
  if (idx >= 0 && idx < BUILD_SECTIONS.length - 1) {
    sessionStorage.setItem(SECTION_ADVANCE_KEY, BUILD_SECTIONS[idx + 1]!);
  }
}

interface BriefBuildPanelProps {
  onGoToReview: () => void;
  onBack?: () => void;
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

export function BriefBuildPanel({ onGoToReview, onBack }: BriefBuildPanelProps) {
  const designBrief = useAppStore((s) => s.designBrief);
  const [openSection, setOpenSection] = useState<BuildSection | null>(readInitialSection);

  const goToNext = (current: BuildSection) => {
    const idx = BUILD_SECTIONS.indexOf(current);
    if (idx >= 0 && idx < BUILD_SECTIONS.length - 1) {
      setOpenSection(BUILD_SECTIONS[idx + 1]!);
    }
  };

  useEffect(() => {
    if (openSection) {
      sessionStorage.setItem(SECTION_STORAGE_KEY, openSection);
    }
  }, [openSection]);

  const toggle = (id: BuildSection) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  const companyName = useAppStore((s) => s.companyName);

  const sections: Array<{
    id: BuildSection;
    step: number;
    label: string;
    description: string;
    icon: typeof Type;
  }> = [
    {
      id: 'typography',
      step: 1,
      label: 'Typography',
      description: companyName.trim()
        ? 'Mark type and letterforms for your brand name'
        : 'Mark style — logo will be symbol-only, no text',
      icon: Type,
    },
    {
      id: 'shapes',
      step: 2,
      label: 'Shapes',
      description: 'Geometry, primitives, grid and symmetry',
      icon: Shapes,
    },
    {
      id: 'style',
      step: 3,
      label: 'Style',
      description: 'Color palette and composition layout',
      icon: Palette,
    },
    {
      id: 'references',
      step: 4,
      label: 'References',
      description: 'Logo Catalog — Müller modernism inspiration',
      icon: BookOpen,
    },
    {
      id: 'client',
      step: 5,
      label: 'Client brief',
      description: 'Client preferences and details',
      icon: MessageCircle,
    },
    {
      id: 'analyze',
      step: 6,
      label: 'Analyze brief',
      description: 'Brain checks gaps and asks what is missing',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-4">
      <BriefProjectSummary />

      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Steps 1–4 build the design brief, step 5 captures client notes, and step 6{' '}
          <span className="text-zinc-300">Analyze brief</span> lets Brain check what is missing before
          generation.
        </p>
      </div>

      <div className="space-y-2">
        {sections.map(({ id, step, label, description, icon: Icon }) => {
          const isOpen = openSection === id;
          const status = sectionStatus(designBrief, id);

          return (
            <div key={id} className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(id)}
                className="w-full flex items-center gap-3 px-3 py-3 bg-zinc-900/60 hover:bg-zinc-900 text-left"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                  {step}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <Icon size={13} className="text-zinc-500 shrink-0" />
                    <span className="text-xs font-medium text-zinc-200">{label}</span>
                    <StatusBadge status={status} />
                  </span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5 truncate">
                    {description}
                  </span>
                </span>
                <ChevronDown
                  size={14}
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
            <ArrowLeft size={14} />
            Project
          </button>
        )}
        <button
          type="button"
          onClick={onGoToReview}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-white transition-colors"
        >
          Review brief
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'done' | 'pending' | 'optional' }) {
  if (status === 'done') {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">
        done
      </span>
    );
  }
  if (status === 'optional') {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
        optional
      </span>
    );
  }
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
      pending
    </span>
  );
}

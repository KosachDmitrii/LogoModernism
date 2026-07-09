import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, Palette, Shapes, Type, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import { AutoBriefButton } from './AutoBriefButton';
import { BriefTypographySection } from './BriefTypographySection';
import { BriefShapesSection } from './BriefShapesSection';
import { BriefReferencesSection } from './BriefReferencesSection';
import { BriefProjectSummary } from './BriefProjectSummary';
import { BriefCoverageMap } from './BriefCoverageMap';

type Section = 'typography' | 'shapes' | 'style' | 'references';

interface BriefBuildPanelProps {
  onGoToReview: () => void;
}

function sectionStatus(
  brief: ReturnType<typeof useAppStore.getState>['designBrief'],
  section: Section,
) {
  if (section === 'typography') {
    const done =
      Boolean(brief.markType) ||
      Boolean(brief.typography.trim()) ||
      brief.sources.some((s) => s.includes('Brand DNA') || s.includes('Pipeline'));
    return done ? 'done' : 'pending';
  }
  if (section === 'shapes') {
    const done =
      Boolean(brief.geometry.trim() || brief.preferredShapes.trim()) ||
      brief.sources.includes('Geometry');
    return done ? 'done' : 'pending';
  }
  if (section === 'style') {
    const done = Boolean(brief.colorPalette && brief.colorPalette !== 'auto');
    return done ? 'done' : 'optional';
  }
  const done = (brief.catalogReferenceIds?.length ?? 0) > 0;
  return done ? 'done' : 'optional';
}

export function BriefBuildPanel({ onGoToReview }: BriefBuildPanelProps) {
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const companyName = useAppStore((s) => s.companyName);
  const [openSection, setOpenSection] = useState<Section | null>('typography');

  const toggle = (id: Section) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  const hasBriefContent = designBrief.sources.length > 0;

  const sections: Array<{
    id: Section;
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
      description: 'Color palette preference',
      icon: Palette,
    },
    {
      id: 'references',
      step: 4,
      label: 'References',
      description: 'Logo Catalog — Müller modernism inspiration',
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-4">
      <BriefProjectSummary />

      <div className="p-4 rounded-xl border border-violet-900/40 bg-violet-950/20 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-violet-900/40 shrink-0">
            <Wand2 size={16} className="text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100">Quick brief</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
              Run typography, shapes, and composition analysis in one click. Best if you have a
              company name.
            </p>
          </div>
        </div>
        <AutoBriefButton />
      </div>

      <p className="text-[10px] text-zinc-600 uppercase tracking-wider text-center">
        or customize step by step
      </p>

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
                  {id === 'typography' && <BriefTypographySection />}
                  {id === 'shapes' && <BriefShapesSection />}
                  {id === 'style' && (
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-500 mb-1">
                        Color palette
                      </label>
                      <select
                        value={designBrief.colorPalette}
                        onChange={(e) =>
                          updateDesignBrief({
                            colorPalette: e.target.value as typeof designBrief.colorPalette,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                      >
                        <option value="">Auto (from rules)</option>
                        <option value="black_white">Black & white only</option>
                        <option value="monochrome">Monochrome</option>
                        <option value="two_color">Two-color max</option>
                        <option value="corporate_blue">Corporate blue</option>
                        <option value="red_accent">Red accent</option>
                        <option value="limited">Limited palette</option>
                      </select>
                    </div>
                  )}
                  {id === 'references' && <BriefReferencesSection />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BriefCoverageMap designBrief={designBrief} />

      {hasBriefContent && (
        <button
          type="button"
          onClick={onGoToReview}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-200 transition-colors"
        >
          Review brief & generate prompts
          <ArrowRight size={14} />
        </button>
      )}
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

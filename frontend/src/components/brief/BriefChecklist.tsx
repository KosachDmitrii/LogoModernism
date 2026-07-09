import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import type { DesignBrief } from '../../types';

interface CheckItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  optional?: boolean;
}

function buildItems(
  industry: string,
  companyName: string,
  preferredEra: string,
  inspirationMode: string,
  brief: DesignBrief,
): CheckItem[] {
  const hasTypography =
    Boolean(brief.markType) ||
    Boolean(brief.typography.trim()) ||
    brief.sources.some((s) => s.includes('Brand DNA') || s.includes('Pipeline'));
  const hasShapes =
    Boolean(brief.geometry.trim() || brief.preferredShapes.trim()) ||
    brief.sources.includes('Geometry');
  const hasColor = Boolean(brief.colorPalette && brief.colorPalette !== 'auto');
  const hasEra = Boolean(brief.era.trim() || preferredEra.trim());
  const hasInspiration = Boolean(inspirationMode.trim() || brief.era.trim());

  return [
    {
      id: 'industry',
      label: 'Industry',
      hint: 'Set on Project step',
      done: Boolean(industry.trim()),
    },
    {
      id: 'brand',
      label: 'Company name',
      hint: companyName.trim() ? 'Text in logo' : 'Symbol-only logo',
      done: true,
      optional: true,
    },
    {
      id: 'era',
      label: 'Era / movement',
      hint: 'Project or from analysis',
      done: hasEra,
    },
    {
      id: 'inspiration',
      label: 'Inspiration',
      hint: 'Project preset or derived from era',
      done: hasInspiration,
      optional: true,
    },
    {
      id: 'typography',
      label: 'Typography',
      hint: 'Mark type & type analysis',
      done: hasTypography,
    },
    {
      id: 'shapes',
      label: 'Shapes',
      hint: 'Geometry & primitives',
      done: hasShapes,
    },
    {
      id: 'color',
      label: 'Color palette',
      hint: 'Optional style preference',
      done: hasColor,
      optional: true,
    },
    {
      id: 'client',
      label: 'Client notes',
      hint: 'Step 5 on Build',
      done: Boolean(brief.clientNotes.trim()),
      optional: true,
    },
    {
      id: 'references',
      label: 'Catalog references',
      hint: 'Logo Catalog inspiration',
      done: (brief.catalogReferenceIds?.length ?? 0) > 0,
      optional: true,
    },
  ];
}

export function BriefChecklist() {
  const industry = useAppStore((s) => s.industry);
  const companyName = useAppStore((s) => s.companyName);
  const preferredEra = useAppStore((s) => s.preferredEra);
  const inspirationMode = useAppStore((s) => s.inspirationMode);
  const designBrief = useAppStore((s) => s.designBrief);

  const items = buildItems(industry, companyName, preferredEra, inspirationMode, designBrief);
  const required = items.filter((item) => !item.optional);
  const requiredDone = required.filter((item) => item.done).length;
  const optionalDone = items.filter((item) => item.optional && item.done).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
          Brief checklist
        </p>
        <span className="text-[10px] text-zinc-500">
          {requiredDone}/{required.length} core
          {optionalDone > 0 ? ` · ${optionalDone} optional` : ''}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className={clsx(
              'flex items-start gap-2 px-2 py-1.5 rounded-lg text-[11px]',
              item.done ? 'text-zinc-300' : 'text-zinc-500',
            )}
          >
            {item.done ? (
              <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Circle size={12} className="text-zinc-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 min-w-0">
              <span className="font-medium">
                {item.label}
                {item.optional && (
                  <span className="text-zinc-600 font-normal"> · optional</span>
                )}
              </span>
              <span className="block text-[10px] text-zinc-600 truncate">{item.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store';
import type { DesignBrief } from '../../types';
import { useT, type MessageKey } from '../../i18n';

interface CheckItem {
  id: string;
  labelKey: MessageKey;
  hintKey: MessageKey;
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
      labelKey: 'brief.checklist.industry',
      hintKey: 'brief.checklist.industryHint',
      done: Boolean(industry.trim()),
    },
    {
      id: 'brand',
      labelKey: 'brief.checklist.companyName',
      hintKey: companyName.trim() ? 'brief.checklist.companyNameText' : 'brief.checklist.companyNameSymbol',
      done: true,
      optional: true,
    },
    {
      id: 'era',
      labelKey: 'brief.checklist.era',
      hintKey: 'brief.checklist.eraHint',
      done: hasEra,
    },
    {
      id: 'inspiration',
      labelKey: 'brief.checklist.inspiration',
      hintKey: 'brief.checklist.inspirationHint',
      done: hasInspiration,
      optional: true,
    },
    {
      id: 'typography',
      labelKey: 'brief.checklist.typography',
      hintKey: 'brief.checklist.typographyHint',
      done: hasTypography,
    },
    {
      id: 'shapes',
      labelKey: 'brief.checklist.shapes',
      hintKey: 'brief.checklist.shapesHint',
      done: hasShapes,
    },
    {
      id: 'color',
      labelKey: 'brief.checklist.color',
      hintKey: 'brief.checklist.colorHint',
      done: hasColor,
      optional: true,
    },
    {
      id: 'client',
      labelKey: 'brief.checklist.clientNotes',
      hintKey: 'brief.checklist.clientNotesHint',
      done: Boolean(brief.clientNotes.trim()),
      optional: true,
    },
    {
      id: 'references',
      labelKey: 'brief.checklist.references',
      hintKey: 'brief.checklist.referencesHint',
      done: (brief.catalogReferenceIds?.length ?? 0) > 0,
      optional: true,
    },
  ];
}

export function BriefChecklist() {
  const t = useT();
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
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {t('brief.checklist.title')}
        </p>
        <span className="text-xs text-zinc-500">
          {t('brief.checklist.coreProgress', { done: requiredDone, total: required.length })}
          {optionalDone > 0 ? ` ${t('brief.checklist.optionalProgress', { count: optionalDone })}` : ''}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className={clsx(
              'flex items-start gap-2 px-2 py-1.5 rounded-lg text-[13px]',
              item.done ? 'text-zinc-300' : 'text-zinc-500',
            )}
          >
            {item.done ? (
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Circle size={14} className="text-zinc-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 min-w-0">
              <span className="font-medium">
                {t(item.labelKey)}
                {item.optional && (
                  <span className="text-zinc-600 font-normal"> · {t('common.optional')}</span>
                )}
              </span>
              <span className="block text-xs text-zinc-600 truncate">{t(item.hintKey)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

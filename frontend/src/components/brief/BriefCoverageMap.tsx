import clsx from 'clsx';
import type { BriefFieldCoverage, DesignBrief } from '../../types';
import { designBriefToBriefContext } from '../../lib/brief-mappers';
import { useT, type MessageKey } from '../../i18n';

const FIELD_LABEL_KEYS: Record<string, MessageKey> = {
  personality: 'brief.coverage.field.personality',
  primaryEmotion: 'brief.coverage.field.primaryEmotion',
  complexity: 'brief.coverage.field.complexity',
  narrative: 'brief.coverage.field.narrative',
  typography: 'brief.coverage.field.typography',
  composition: 'brief.coverage.field.composition',
  constraints: 'brief.coverage.field.constraints',
  geometry: 'brief.coverage.field.geometry',
  construction: 'brief.coverage.field.construction',
  preferredShapes: 'brief.coverage.field.preferredShapes',
  colorPalette: 'brief.coverage.field.colorPalette',
  colorSelections: 'brief.coverage.field.colorSelections',
  allowShadows: 'brief.coverage.field.allowShadows',
  allowPhotoreal: 'brief.coverage.field.allowPhotoreal',
  clientNotes: 'brief.coverage.field.clientNotes',
  markType: 'brief.coverage.field.markType',
  typographyStyle: 'brief.coverage.field.typographyStyle',
  principleIds: 'brief.coverage.principles',
  catalogReferenceIds: 'brief.coverage.field.catalogRefs',
};

interface BriefCoverageMapProps {
  designBrief: DesignBrief;
  /** Post-generation coverage from prompt metadata */
  promptCoverage?: BriefFieldCoverage[];
  compact?: boolean;
}

export function BriefCoverageMap({ designBrief, promptCoverage, compact }: BriefCoverageMapProps) {
  const t = useT();

  const fieldLabel = (field: string) => {
    const key = FIELD_LABEL_KEYS[field];
    return key ? t(key) : field;
  };

  const pendingContext = designBriefToBriefContext(designBrief);
  const pendingFields = pendingContext
    ? Object.entries(pendingContext).map(([field, value]) => ({
        field,
        label: fieldLabel(field),
        snippet: String(value).slice(0, 60),
      }))
    : [];

  const extraBriefFields = [
    { field: 'markType', value: designBrief.markType },
    { field: 'typographyStyle', value: designBrief.typographyStyle },
    {
      field: 'principleIds',
      value: designBrief.principleIds?.length
        ? t('brief.coverage.idsCount', { count: designBrief.principleIds.length })
        : '',
    },
    {
      field: 'catalogReferenceIds',
      value: designBrief.catalogReferenceIds?.length
        ? t('brief.coverage.refsCount', { count: designBrief.catalogReferenceIds.length })
        : '',
    },
  ].filter((item) => Boolean(item.value));

  if (pendingFields.length === 0 && extraBriefFields.length === 0 && !promptCoverage?.length) {
    return (
      <div className="p-3 rounded-xl bg-zinc-950/50 border border-dashed border-zinc-800 text-center space-y-1">
        <p className="text-[13px] text-zinc-500">{t('brief.coverage.empty')}</p>
        <p className="text-xs text-zinc-600">{t('brief.coverage.emptyHint')}</p>
      </div>
    );
  }

  if (promptCoverage?.length) {
    const included = promptCoverage.filter((c) => c.included).length;
    return (
      <div className={clsx('space-y-2', compact ? '' : 'p-3 rounded-xl bg-zinc-950/50 border border-zinc-800')}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-zinc-400">{t('brief.coverage.inPrompt')}</p>
          <span className="text-xs text-zinc-500">
            {included}/{promptCoverage.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {promptCoverage.map((item) => (
            <span
              key={item.field}
              title={item.snippet}
              className={clsx(
                'text-xs px-2 py-0.5 rounded-full border',
                item.included
                  ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-600 line-through',
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const allPending = [
    ...pendingFields,
    ...extraBriefFields.map((item) => ({
      field: item.field,
      label: fieldLabel(item.field),
      snippet: String(item.value),
    })),
  ];

  return (
    <div className={clsx('space-y-2', compact ? '' : 'p-3 rounded-xl bg-zinc-950/50 border border-zinc-800')}>
      <p className="text-[13px] font-medium text-zinc-500">{t('brief.coverage.willSend')}</p>
      <div className="flex flex-wrap gap-1.5">
        {allPending.map((item) => (
          <span
            key={item.field}
            title={item.snippet}
            className="text-xs px-2 py-0.5 rounded-full border border-violet-800/40 bg-violet-950/30 text-violet-300"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

import clsx from 'clsx';
import type { BriefFieldCoverage, DesignBrief } from '../../types';
import { designBriefToBriefContext } from '../../lib/brief-mappers';

const FIELD_LABELS: Record<string, string> = {
  personality: 'Personality',
  primaryEmotion: 'Primary emotion',
  complexity: 'Complexity',
  narrative: 'Narrative',
  typography: 'Typography',
  composition: 'Composition',
  constraints: 'Constraints',
  geometry: 'Geometry',
  construction: 'Construction',
  preferredShapes: 'Preferred shapes',
  colorPalette: 'Color palette',
  colorSelections: 'Selected colors',
  allowShadows: 'Shadows',
  allowPhotoreal: 'Photoreal',
  clientNotes: 'Client notes',
  markType: 'Mark type',
  typographyStyle: 'Typography style',
  principleIds: 'Principles',
  catalogReferenceIds: 'Catalog refs',
};

interface BriefCoverageMapProps {
  designBrief: DesignBrief;
  /** Post-generation coverage from prompt metadata */
  promptCoverage?: BriefFieldCoverage[];
  compact?: boolean;
}

export function BriefCoverageMap({ designBrief, promptCoverage, compact }: BriefCoverageMapProps) {
  const pendingContext = designBriefToBriefContext(designBrief);
  const pendingFields = pendingContext
    ? Object.entries(pendingContext).map(([field, value]) => ({
        field,
        label: FIELD_LABELS[field] ?? field,
        snippet: String(value).slice(0, 60),
      }))
    : [];

  const extraBriefFields = [
    { field: 'markType', value: designBrief.markType },
    { field: 'typographyStyle', value: designBrief.typographyStyle },
    { field: 'principleIds', value: designBrief.principleIds?.length ? `${designBrief.principleIds.length} IDs` : '' },
    { field: 'catalogReferenceIds', value: designBrief.catalogReferenceIds?.length ? `${designBrief.catalogReferenceIds.length} refs` : '' },
  ].filter((item) => Boolean(item.value));

  if (pendingFields.length === 0 && extraBriefFields.length === 0 && !promptCoverage?.length) {
    return (
      <div className="p-3 rounded-xl bg-zinc-950/50 border border-dashed border-zinc-800 text-center space-y-1">
        <p className="text-[11px] text-zinc-500">Nothing in the brief yet</p>
        <p className="text-[10px] text-zinc-600">
          Run Quick brief or open Typography / Shapes above — fields will appear here
        </p>
      </div>
    );
  }

  if (promptCoverage?.length) {
    const included = promptCoverage.filter((c) => c.included).length;
    return (
      <div className={clsx('space-y-2', compact ? '' : 'p-3 rounded-xl bg-zinc-950/50 border border-zinc-800')}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-zinc-400">Brief coverage in prompt</p>
          <span className="text-[10px] text-zinc-500">
            {included}/{promptCoverage.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {promptCoverage.map((item) => (
            <span
              key={item.field}
              title={item.snippet}
              className={clsx(
                'text-[10px] px-2 py-0.5 rounded-full border',
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
      label: FIELD_LABELS[item.field] ?? item.field,
      snippet: String(item.value),
    })),
  ];

  return (
    <div className={clsx('space-y-2', compact ? '' : 'p-3 rounded-xl bg-zinc-950/50 border border-zinc-800')}>
      <p className="text-[11px] font-medium text-zinc-400">Will be sent to prompt</p>
      <div className="flex flex-wrap gap-1.5">
        {allPending.map((item) => (
          <span
            key={item.field}
            title={item.snippet}
            className="text-[10px] px-2 py-0.5 rounded-full border border-blue-900/40 bg-blue-950/30 text-blue-300"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

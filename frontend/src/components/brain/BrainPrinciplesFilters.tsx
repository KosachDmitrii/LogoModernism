import type { LearnedPrincipleCategoryCount, LearnedPrinciplesSort } from '../../types';
import { useMemo } from 'react';
import { useT, type MessageKey } from '../../i18n';
import { formatBrainLabel } from '../../lib/brain-labels';
import { CustomSelect } from '../CustomSelect';

const SORT_LABEL_KEYS: Record<LearnedPrinciplesSort, MessageKey> = {
  influence_desc: 'brain.principles.sort.influenceDesc',
  influence_asc: 'brain.principles.sort.influenceAsc',
  category: 'brain.principles.sort.category',
};

interface BrainPrinciplesFiltersProps {
  categories: LearnedPrincipleCategoryCount[];
  category: string;
  sort: LearnedPrinciplesSort;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: LearnedPrinciplesSort) => void;
}

export function BrainPrinciplesFilters({
  categories,
  category,
  sort,
  onCategoryChange,
  onSortChange,
}: BrainPrinciplesFiltersProps) {
  const t = useT();

  const categoryOptions = useMemo(
    () => [
      { value: '', label: t('brain.principles.filter.all') },
      ...categories.map((item) => ({
        value: item.category,
        label: `${formatBrainLabel(item.category)} (${item.count})`,
      })),
    ],
    [categories, t],
  );

  const sortOptions = useMemo(
    () =>
      (Object.keys(SORT_LABEL_KEYS) as LearnedPrinciplesSort[]).map((value) => ({
        value,
        label: t(SORT_LABEL_KEYS[value]),
      })),
    [t],
  );

  return (
    <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <label className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {t('brain.principles.filter.label')}
        </span>
        <CustomSelect
          value={category}
          onChange={onCategoryChange}
          options={categoryOptions}
          size="sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {t('brain.principles.sort.label')}
        </span>
        <CustomSelect
          value={sort}
          onChange={(value) => onSortChange(value as LearnedPrinciplesSort)}
          options={sortOptions}
          size="sm"
          searchable={false}
        />
      </label>
    </div>
  );
}

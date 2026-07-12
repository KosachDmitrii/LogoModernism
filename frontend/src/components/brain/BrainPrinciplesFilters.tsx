import type { LearnedPrincipleCategoryCount, LearnedPrinciplesSort } from '../../types';
import { useT, type MessageKey } from '../../i18n';
import { formatBrainLabel } from '../../lib/brain-labels';

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

  return (
    <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <label className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {t('brain.principles.filter.label')}
        </span>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-200"
        >
          <option value="">{t('brain.principles.filter.all')}</option>
          {categories.map((item) => (
            <option key={item.category} value={item.category}>
              {formatBrainLabel(item.category)} ({item.count})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {t('brain.principles.sort.label')}
        </span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as LearnedPrinciplesSort)}
          className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-200"
        >
          {(Object.keys(SORT_LABEL_KEYS) as LearnedPrinciplesSort[]).map((value) => (
            <option key={value} value={value}>
              {t(SORT_LABEL_KEYS[value])}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

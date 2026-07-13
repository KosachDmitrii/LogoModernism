import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n';

export const BRAIN_PRINCIPLES_PAGE_SIZE = 50;
export const BRAIN_TOP_PRINCIPLES_LIMIT = 10;

interface BrainPrinciplesPaginationProps {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function BrainPrinciplesPagination({
  page,
  totalItems,
  pageSize = BRAIN_PRINCIPLES_PAGE_SIZE,
  onPageChange,
}: BrainPrinciplesPaginationProps) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 pt-2"
      aria-label={t('brain.principlesPagination')}
    >
      <p className="text-xs text-zinc-500">
        {t('brain.principlesRange', { from, to, total: totalItems })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          {t('common.previous')}
        </button>
        <span className="text-xs text-zinc-400 tabular-nums">
          {t('brain.principlesPage', { page, total: totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('common.next')}
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}

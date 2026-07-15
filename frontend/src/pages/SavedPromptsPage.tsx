import { useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { listSavedPrompts, type SavedPromptsPage as SavedPromptsPageData } from '../api';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { PromptCard } from '../components/PromptCard';
import { industryLabel } from '../lib/translate-labels';
import { formatError } from '../lib/api-error';
import { useT, useLocale } from '../i18n';
import { Button } from '../components/ui/Button';

function formatSavedAt(value: string | undefined, locale: 'en' | 'ru') {
  if (!value) return '';
  return new Date(value).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SavedPromptsPage() {
  const t = useT();
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['saved-prompts'],
    queryFn: ({ pageParam, signal }) => listSavedPrompts(pageParam, 20, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const prompts = data?.pages.flatMap((page) => page.prompts) ?? [];
  const total = data?.pages[0]?.total ?? prompts.length;

  const updateSavedPrompt = (prompt: (typeof prompts)[number], saved: boolean) => {
    queryClient.setQueryData<InfiniteData<SavedPromptsPageData, string | null>>(
      ['saved-prompts'],
      (current) => {
        if (!current) return current;
        const exists = current.pages.some((page) => page.prompts.some((item) => item.id === prompt.id));
        if (saved === exists) return current;

        const pages = current.pages.map((page, index) => ({
          ...page,
          total:
            page.total === undefined
              ? undefined
              : Math.max(0, page.total + (saved ? 1 : -1)),
          prompts: saved && index === 0
            ? [{ ...prompt, saved: true }, ...page.prompts]
            : page.prompts.filter((item) => item.id !== prompt.id),
        }));
        return { ...current, pages };
      },
    );
    if (!saved) setSelectedId((current) => (current === prompt.id ? null : current));
  };

  return (
    <PageContainer>
      <PageHeader page="saved" subtitle={t('saved.subtitle')} />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
          <Loader2 size={20} className="animate-spin" />
          {t('saved.loading')}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-300">
            {formatError(error, t)}
          </p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl border border-zinc-800 flex items-center justify-center mb-4">
            <Heart size={28} className="text-zinc-600" />
          </div>
          <h2 className="text-lg font-medium text-zinc-300 mb-2">{t('saved.emptyTitle')}</h2>
          <p className="text-sm text-zinc-500 max-w-sm">{t('saved.emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto w-full">
          <p className="text-sm text-zinc-400">
            {total === 1 ? t('saved.count', { count: total }) : t('saved.countPlural', { count: total })}
          </p>
          {prompts.map((prompt) => (
            <div key={prompt.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-[13px] text-zinc-500">
                {prompt.companyName && (
                  <span>
                    <span className="text-zinc-600">{t('saved.companyLabel')}</span> {prompt.companyName}
                  </span>
                )}
                <span>
                  <span className="text-zinc-600">{t('saved.industryLabel')}</span>{' '}
                  {industryLabel(prompt.industry, t)}
                </span>
                {prompt.savedAt && (
                  <span>
                    <span className="text-zinc-600">{t('saved.savedLabel')}</span>{' '}
                    {formatSavedAt(prompt.savedAt, locale)}
                  </span>
                )}
              </div>
              <PromptCard
                prompt={prompt}
                rank={prompt.rank ?? undefined}
                selected={selectedId === prompt.id}
                onSelect={() => setSelectedId((current) => (current === prompt.id ? null : prompt.id))}
                standalone
                onSavedChange={(saved) => updateSavedPrompt(prompt, saved)}
              />
            </div>
          ))}
          {hasNextPage && (
            <Button
              type="button"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              className="mx-auto flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
            >
              {isFetchingNextPage && <Loader2 size={16} className="animate-spin" />}
              {t('saved.loadMore')}
            </Button>
          )}
        </div>
      )}
    </PageContainer>
  );
}

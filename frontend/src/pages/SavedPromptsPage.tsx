import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { listSavedPrompts } from '../api';
import { PageContainer } from '../components/PageContainer';
import { PageHeader } from '../components/PageHeader';
import { PromptCard } from '../components/PromptCard';
import { industryLabel } from '../lib/translate-labels';
import { formatError } from '../lib/api-error';
import { useT, useLocale } from '../i18n';

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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['saved-prompts'],
    queryFn: () => listSavedPrompts(),
  });

  const prompts = data?.prompts ?? [];
  const total = data?.total ?? prompts.length;

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
                onStateChange={() => refetch()}
              />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
